import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

type FlagType = "dead" | "report";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      visitorId?: string;
      linkId?: string;
      flagType?: FlagType;
      note?: string;
    };

    const visitorId = (body?.visitorId || "").trim();
    const linkId = (body?.linkId || "").trim();
    const flagType = body?.flagType;
    const note = (body?.note || "").trim();

    if (!visitorId || !linkId || (flagType !== "dead" && flagType !== "report")) {
      return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
    }

    const supabase = getSupabase();

    // If link_flags table doesn't exist or RLS blocks it, this will error.
    // The UI will still work (we also keep a local flag list client-side).
    const { error } = await supabase.from("link_flags").insert({
      visitor_id: visitorId,
      link_id: linkId,
      flag_type: flagType,
      note: note || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}