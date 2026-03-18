import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

type Mode = "shuffle" | "newest";

type LinkRow = {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  created_at?: string | null;
};

function pickFirstString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function toLinkRow(row: Record<string, unknown>): LinkRow | null {
  const id = pickFirstString(row.id, row.link_id, row.linkId);
  const url = pickFirstString(row.url, row.link_url, row.linkUrl, row.href);
  if (!id || !url) return null;

  const title = pickFirstString(row.title, row.name, row.page_title);
  const description = pickFirstString(
    row.description,
    row.relative_description,
    row.link_description,
    row.linkDescription,
    row.summary,
    row.tagline,
    // Common case-sensitive column from your Supabase schema.
    row.Notes,
    row["Notes"],
    row.notes
  );
  const created_at =
    pickFirstString(row.created_at, row.createdAt, row.created) ?? null;

  return { id, url, title: title ?? null, description: description ?? null, created_at };
}

function isActiveLink(row: Record<string, unknown>): boolean {
  // Prefer an explicit "status" string if present.
  const status = pickFirstString(row.status, row.state);
  if (status) return status.toLowerCase() === "active";

  // Otherwise treat common boolean column names as the source of truth.
  const activeBool =
    row["is_active"] ??
    row["isActive"] ??
    row["active"] ??
    row["enabled"] ??
    row["isEnabled"];
  if (typeof activeBool === "boolean") return activeBool;

  // If we have no active indicator fields, don't drop links.
  return true;
}

function pickRandom<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx] ?? null;
}

async function checkEmbeddable(url: string): Promise<boolean> {
  // Best-effort: many sites block iframes via `X-Frame-Options` or CSP
  // `frame-ancestors`. We can't override those headers, but we can avoid
  // showing the embedded "blocked" page by detecting common cases.
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;

    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local")
    ) {
      return false;
    }

    // Basic SSRF prevention (only checks common private ranges).
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      const parts = host.split(".").map((p) => Number(p));
      const [a, b] = parts;
      const isPrivateIPv4 =
        a === 10 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        a === 127 ||
        a === 169;
      if (isPrivateIPv4) return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    let res: Response;
    try {
      // GET with a tiny Range is more reliable than HEAD across servers and
      // still gives us response headers like X-Frame-Options/CSP.
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { Range: "bytes=0-0" },
      });
    } catch {
      // If probing fails, assume it's not safely embeddable.
      return false;
    } finally {
      clearTimeout(timeout);
    }

    if (res.status >= 400) return false;

    const xFrameOptions = res.headers.get("x-frame-options")?.toLowerCase() ?? "";
    if (xFrameOptions.includes("deny")) return false;
    if (xFrameOptions.includes("sameorigin")) return false;

    const csp = res.headers.get("content-security-policy")?.toLowerCase() ?? "";
    const frameIdx = csp.indexOf("frame-ancestors");
    if (frameIdx !== -1) {
      // Very lightweight parsing: extract the directive until the next `;`
      const directive = csp.slice(frameIdx).split(";")[0];
      if (directive.includes("'none'") || directive.includes(" none")) return false;
      if (directive.includes("*")) return true;
      if (directive.includes("'self'") || directive.includes(" self")) return false;

      // If frame-ancestors is present but restrictive, assume it won't allow
      // embedding into our app.
      return false;
    }

    return true;
  } catch {
    // If we can't determine, default to NOT embedding so the user still
    // gets a reliable "Open ↗" experience instead of a blocked iframe.
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      visitorId?: string;
      mode?: Mode;
    };

    const visitorId = (body?.visitorId || "").trim();
    const mode: Mode = body?.mode === "newest" ? "newest" : "shuffle";

    if (!visitorId) {
      return NextResponse.json({ error: "Missing visitorId" }, { status: 400 });
    }

    const supabase = getSupabase();

    // 1) Query "active" links using the original schema assumption
    // 2) If that fails (status column mismatch, etc), fall back to selecting
    //    * and filtering in JS.
    let typedLinks: LinkRow[] = [];
    {
      const { data: links, error: linksError } = await supabase
        .from("links")
        // Include both `description` (snake/modern) and `Notes` (your schema).
        .select('id, url, title, description, "Notes", created_at')
        .eq("status", "active");

      if (linksError) {
        console.error("Supabase linksError (status filter):", {
          message: linksError.message,
          code: linksError.code,
          details: linksError.details,
          hint: linksError.hint,
        });

        // Fallback: avoid hard-failing on "status" column mismatches.
        const { data: linksAny, error: linksErrorAny } = await supabase
          .from("links")
          .select("*")
          .limit(1000);

        if (linksErrorAny) {
          const detailLine = linksErrorAny.details?.split("\n")[0]?.trim();
          console.error("Supabase linksError (* fallback):", {
            message: linksErrorAny.message,
            code: linksErrorAny.code,
            details: linksErrorAny.details,
            hint: linksErrorAny.hint,
          });
          return NextResponse.json(
            {
              error: `Links query failed: ${linksErrorAny.message}${
                detailLine ? ` (${detailLine})` : ""
              }`,
            },
            { status: 500 }
          );
        }

        const activeRows = (linksAny ?? []).filter((row) =>
          isActiveLink(row as Record<string, unknown>)
        );
        typedLinks = activeRows
          .map((row) => toLinkRow(row as Record<string, unknown>))
          .filter((l): l is LinkRow => Boolean(l));
      } else if (!links || links.length === 0) {
        // No rows matched. The column may exist but the "active" value may
        // differ (boolean flags, different status casing, etc).
        const { data: linksAny, error: linksErrorAny } = await supabase
          .from("links")
          .select("*")
          .limit(1000);

        if (linksErrorAny) {
          const detailLine = linksErrorAny.details?.split("\n")[0]?.trim();
          console.error("Supabase linksError (* fallback after empty):", {
            message: linksErrorAny.message,
            code: linksErrorAny.code,
            details: linksErrorAny.details,
            hint: linksErrorAny.hint,
          });
          return NextResponse.json(
            {
              error: `Links query failed: ${linksErrorAny.message}${
                detailLine ? ` (${detailLine})` : ""
              }`,
            },
            { status: 500 }
          );
        } else {
          const activeRows = (linksAny ?? []).filter((row) =>
            isActiveLink(row as Record<string, unknown>)
          );
          typedLinks = activeRows
            .map((row) => toLinkRow(row as Record<string, unknown>))
            .filter((l): l is LinkRow => Boolean(l));
        }
      } else {
        typedLinks = (links ?? []) as LinkRow[];
      }
    }

    if (typedLinks.length === 0) {
      return NextResponse.json({ error: "No links found in database." }, { status: 404 });
    }

    const { data: views, error: viewsError } = await supabase
      .from("views")
      .select("link_id")
      .eq("visitor_id", visitorId);

    // Views logging/dedup is optional for functionality; failing here should
    // not block getting the next link.
    if (viewsError) {
      console.error("Supabase viewsError (non-fatal):", {
        message: viewsError.message,
        code: viewsError.code,
        details: viewsError.details,
        hint: viewsError.hint,
      });
    }

    const seen = new Set(
      ((views ?? []) as Array<{ link_id: string }>).map((v) => v.link_id)
    );
    const unseen = typedLinks.filter((l) => !seen.has(l.id));

    let next: LinkRow | null = null;

    if (unseen.length > 0) {
      if (mode === "newest") {
        unseen.sort((a, b) => {
          const at = new Date(a.created_at || 0).getTime();
          const bt = new Date(b.created_at || 0).getTime();
          return bt - at;
        });
        next = unseen[0] ?? null;
      } else {
        next = pickRandom(unseen);
      }
    } else {
      if (mode === "newest") {
        typedLinks.sort((a, b) => {
          const at = new Date(a.created_at || 0).getTime();
          const bt = new Date(b.created_at || 0).getTime();
          return bt - at;
        });
        next = typedLinks[0] ?? null;
      } else {
        next = pickRandom(typedLinks);
      }
    }

    if (!next) {
      return NextResponse.json({ error: "Failed to pick link." }, { status: 500 });
    }

    // Don't let duplicate insert errors kill the response
    const { error: insertError } = await supabase.from("views").insert({
      visitor_id: visitorId,
      link_id: next.id,
    });

    if (insertError) {
      console.error("Supabase insertError (non-fatal):", {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      });
      // We still return the link even if the view log fails
    }

    const embedAllowed = await checkEmbeddable(next.url);

    return NextResponse.json({
      id: next.id,
      url: next.url,
      title: next.title ?? null,
      description: next.description ?? null,
      category: null,
      isRepeat: unseen.length === 0,
      embedAllowed,
      stats: {
        totalActive: typedLinks.length,
        seenCount: Math.min(seen.size + 1, typedLinks.length),
        remainingUnseen: Math.max(unseen.length - 1, 0),
      },
    });
  } catch (err: unknown) {
    console.error("API /api/next fatal error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown server error",
      },
      { status: 500 }
    );
  }
}