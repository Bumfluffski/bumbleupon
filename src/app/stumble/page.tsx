"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type Mode = "shuffle" | "newest";

type NextResponseShape = {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  category: string | null;
  isRepeat: boolean;
  embedAllowed?: boolean;
  stats?: {
    totalActive: number;
    seenCount: number;
    remainingUnseen: number;
  };
};

type HistoryItem = NextResponseShape;

function getOrCreateVisitorId(): string {
  const key = "bumbleupon_visitor_id";
  const existing =
    typeof window !== "undefined" ? window.localStorage.getItem(key) : null;

  if (existing) return existing;

  const id =
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto &&
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `v_${Math.random().toString(16).slice(2)}_${Date.now()}`;

  window.localStorage.setItem(key, id);
  return id;
}

function lsGetJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function lsSetJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export default function StumblePage() {
  const [visitorId, setVisitorId] = useState("");
  const [mode] = useState<Mode>("shuffle");

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [dislikedIds, setDislikedIds] = useState<Set<string>>(new Set());

  const [loadingNext, setLoadingNext] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [overlayHidden, setOverlayHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const toastTimer = useRef<number | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [overlayHeight, setOverlayHeight] = useState(76);

  const current = historyIndex >= 0 ? history[historyIndex] : null;

  const canBack = historyIndex > 0;
  const canForward = historyIndex >= 0 && historyIndex < history.length - 1;
  const canClick = !!visitorId && !loadingNext;

  const savedCount = savedIds.size;
  const isSaved = current ? savedIds.has(current.id) : false;
  const isLiked = current ? likedIds.has(current.id) : false;
  const isDisliked = current ? dislikedIds.has(current.id) : false;
  const canEmbed = current?.embedAllowed !== false;

  // Keep the main content pushed below the fixed header.
  // Measuring avoids the fixed banner overlapping/stealing clicks if the
  // toolbar is taller than the estimated value.
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    setOverlayHeight(Math.ceil(el.getBoundingClientRect().height));
  }, [overlayHidden]);

  useEffect(() => {
    setVisitorId(getOrCreateVisitorId());
  }, []);

  useEffect(() => {
    if (!visitorId) return;

    setSavedIds(new Set(lsGetJSON<string[]>(`bumble_saved_${visitorId}`, [])));
    setLikedIds(new Set(lsGetJSON<string[]>(`bumble_liked_${visitorId}`, [])));
    setDislikedIds(new Set(lsGetJSON<string[]>(`bumble_disliked_${visitorId}`, [])));
  }, [visitorId]);

  useEffect(() => {
    if (!visitorId) return;
    lsSetJSON(`bumble_saved_${visitorId}`, Array.from(savedIds));
  }, [savedIds, visitorId]);

  useEffect(() => {
    if (!visitorId) return;
    lsSetJSON(`bumble_liked_${visitorId}`, Array.from(likedIds));
  }, [likedIds, visitorId]);

  useEffect(() => {
    if (!visitorId) return;
    lsSetJSON(`bumble_disliked_${visitorId}`, Array.from(dislikedIds));
  }, [dislikedIds, visitorId]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }
    toastTimer.current = window.setTimeout(() => setToast(null), 1400);
  }

  async function fetchNextAndPush() {
    if (!visitorId) return;

    setLoadingNext(true);
    setIframeLoading(true);
    setError(null);

    try {
      // In production this app is mounted at /bumbleupon, so hit the
      // basePath-prefixed API route. Locally (no basePath) this still works
      // because Next will serve /bumbleupon/api/next as well.
      const res = await fetch("/bumbleupon/api/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, mode }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setError(data?.error || `Couldn’t fetch a fresh Bum-ble. (${res.status})`);
        setLoadingNext(false);
        setIframeLoading(false);
        return;
      }

      if (!data.id || !data.url) {
        setError("No link returned.");
        setLoadingNext(false);
        setIframeLoading(false);
        return;
      }

      const item: HistoryItem = {
        id: data.id,
        url: data.url,
        title: data.title ?? null,
        description: data.description ?? null,
        category: data.category ?? null,
        isRepeat: Boolean(data.isRepeat),
        embedAllowed: data.embedAllowed,
        stats: data.stats,
      };

      setHistory((prev) => {
        const base = prev.slice(0, historyIndex + 1);
        return [...base, item];
      });
      setHistoryIndex((i) => i + 1);

      setLoadingNext(false);
    } catch (e: any) {
      setError(e?.message || "Something went sideways.");
      setLoadingNext(false);
      setIframeLoading(false);
    }
  }

  function goBack() {
    if (!canBack) return;
    setError(null);
    setIframeLoading(true);
    setHistoryIndex((i) => i - 1);
  }

  function goForward() {
    if (!canForward) return;
    setError(null);
    setIframeLoading(true);
    setHistoryIndex((i) => i + 1);
  }

  function toggleSaved() {
    if (!current) return;

    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(current.id)) {
        next.delete(current.id);
        showToast("Removed from saved.");
      } else {
        next.add(current.id);
        showToast("Saved.");
      }
      return next;
    });
  }

  function toggleLiked() {
    if (!current) return;

    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(current.id)) {
        next.delete(current.id);
        showToast("Thumb removed.");
      } else {
        next.add(current.id);
        showToast("Good taste.");
      }
      return next;
    });

    setDislikedIds((prev) => {
      const next = new Set(prev);
      next.delete(current.id);
      return next;
    });
  }

  function toggleDisliked() {
    if (!current) return;

    setDislikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(current.id)) {
        next.delete(current.id);
        showToast("Thumb removed.");
      } else {
        next.add(current.id);
        showToast("Fair enough.");
      }
      return next;
    });

    setLikedIds((prev) => {
      const next = new Set(prev);
      next.delete(current.id);
      return next;
    });
  }

  async function shareCurrent() {
    if (!current?.url) return;

    try {
      // @ts-ignore
      if (navigator.share) {
        // @ts-ignore
        await navigator.share({
          title: current.title || "Bum-bleUpon",
          text: "Found this on Bum-bleUpon",
          url: current.url,
        });
        showToast("Shared.");
        return;
      }

      await navigator.clipboard.writeText(current.url);
      showToast("Link copied.");
    } catch {
      showToast("Couldn’t share.");
    }
  }

  useEffect(() => {
    if (visitorId && history.length === 0) {
      void fetchNextAndPush();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();

      if (tag === "input" || tag === "textarea" || (target as any)?.isContentEditable) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goForward();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (canClick) void fetchNextAndPush();
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        toggleSaved();
      } else if (e.key.toLowerCase() === "h") {
        e.preventDefault();
        setOverlayHidden((v) => !v);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const statusText = useMemo(() => {
    if (isLiked) return "You gave this one a thumbs up. Good taste.";
    if (isDisliked) return "You gave this one a thumbs down. Fair enough.";
    if (current?.isRepeat)
      return current.description ?? "You’ve hit the end. Looping the good stuff.";
    return "One click from another corner of the internet.";
  }, [isLiked, isDisliked, current?.isRepeat, current?.description]);

  return (
    <main
      className="min-h-screen bg-[#7f8b93] text-[#2a2a2a]"
      style={{ fontFamily: "Verdana, Tahoma, sans-serif" }}
    >
      <div ref={headerRef} className="fixed inset-x-0 top-0 z-50">
        {overlayHidden ? (
          <div className="flex h-[14px] items-center justify-end bg-[#bfc6cc] px-2 text-[10px] text-[#334155]">
            <button onClick={() => setOverlayHidden(false)} className="hover:underline">
              show toolbar
            </button>
          </div>
        ) : (
          <>
            <div className="border-b border-[#9da0a6] bg-gradient-to-b from-[#f3f3f5] via-[#dedfe3] to-[#c8ccd2] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
              <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold">
                <Link
                  href="/"
                  className="rounded-md border border-[#a4a8ad] bg-white/70 px-3 py-1 text-[#2a2a2a] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] hover:bg-white/90"
                >
                  BUM-BLEUPON
                </Link>

                <button
                  onClick={goBack}
                  disabled={!canBack}
                  className="rounded-md border border-[#8e9398] bg-gradient-to-b from-[#ffffff] to-[#d8dde2] px-2 py-1 text-[#4b5563] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] active:translate-y-[1px] disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Back"
                >
                  ◀
                </button>

                <button
                  onClick={() => void fetchNextAndPush()}
                  disabled={!canClick}
                  className="rounded-xl border border-[#4a8b10] bg-gradient-to-b from-[#9af53c] via-[#71cd1f] to-[#4ea90e] px-5 py-1.5 text-[14px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_1px_0_rgba(0,0,0,0.15)] active:translate-y-[1px] disabled:opacity-60 disabled:cursor-not-allowed"
                  title="BUM-BLE"
                >
                  {loadingNext ? "BUM-BLING..." : "BUM-BLE!"}
                </button>

                <button
                  onClick={goForward}
                  disabled={!canForward}
                  className="rounded-md border border-[#8e9398] bg-gradient-to-b from-[#ffffff] to-[#d8dde2] px-2 py-1 text-[#4b5563] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] active:translate-y-[1px] disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Forward"
                >
                  ▶
                </button>

                <div className="ml-2 flex items-center gap-1">
                  <button
                    onClick={toggleSaved}
                    disabled={!current}
                    className={`rounded-md border px-3 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSaved
                        ? "border-[#c1860d] bg-gradient-to-b from-[#ffd65f] to-[#f0b81c] text-[#6b4a00]"
                        : "border-[#d7a21d] bg-gradient-to-b from-[#ffe189] to-[#f0c84a] text-[#6b4a00]"
                    }`}
                    title="Save"
                  >
                    ★ Save
                  </button>

                  <button
                    onClick={toggleLiked}
                    disabled={!current}
                    className={`rounded-md border border-[#a4a8ad] bg-gradient-to-b from-[#ffffff] to-[#d8dde2] px-3 py-1 text-[#4b5563] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed ${
                      isLiked ? "ring-2 ring-[#77c52f]" : ""
                    }`}
                    title="Like"
                  >
                    👍
                  </button>

                  <button
                    onClick={toggleDisliked}
                    disabled={!current}
                    className={`rounded-md border border-[#a4a8ad] bg-gradient-to-b from-[#ffffff] to-[#d8dde2] px-3 py-1 text-[#4b5563] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDisliked ? "ring-2 ring-[#d17a62]" : ""
                    }`}
                    title="Dislike"
                  >
                    👎
                  </button>

                  <button
                    onClick={shareCurrent}
                    disabled={!current}
                    className="rounded-md border border-[#a4a8ad] bg-gradient-to-b from-[#ffffff] to-[#d8dde2] px-3 py-1 text-[#4b5563] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Share"
                  >
                    Share
                  </button>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  {current?.url ? (
                    <a
                      href={current.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-[#8e9398] bg-gradient-to-b from-[#ffffff] to-[#d8dde2] px-3 py-1 text-[12px] font-normal text-[#334155] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]"
                    >
                      Open ↗
                    </a>
                  ) : null}

                  <div className="rounded-md border border-[#a4a8ad] bg-white/75 px-3 py-1 text-[12px] font-normal text-[#334155]">
                    {current?.category || "Loading..."} · Seen{" "}
                    {current?.stats?.seenCount ?? Math.max(historyIndex + 1, 0)}/
                    {current?.stats?.totalActive ?? (history.length || 0)} · Saved {savedCount}
                  </div>

                  <button
                    onClick={() => setOverlayHidden(true)}
                    className="rounded-md border border-[#a4a8ad] bg-gradient-to-b from-[#ffffff] to-[#d8dde2] px-2 py-1 text-[11px] font-normal text-[#4b5563] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]"
                    title="Hide toolbar"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <div className="border-b border-[#c9b88d] bg-[linear-gradient(180deg,#f6edd4_0%,#eadbb6_100%)] px-5 py-3 text-[12px] text-[#5b4b2f]">
              <span className="font-bold">Now stumbling:</span>{" "}
              {current?.title || "Summoning the first Bum-ble..."} · {statusText}
              {toast ? <span className="ml-3 font-bold text-[#6b4a00]">{toast}</span> : null}
            </div>
          </>
        )}
      </div>

      <div style={{ paddingTop: overlayHeight }}>
        {error ? (
          <div className="mx-auto max-w-6xl px-4 pt-4">
            <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          </div>
        ) : null}

        {current?.url ? (
          canEmbed ? (
            <div
              className="relative bg-[radial-gradient(circle_at_top,#f8f1d7,transparent_30%),linear-gradient(180deg,#f7f2df_0%,#e8dcc0_100%)]"
              style={{ height: `calc(100vh - ${overlayHeight}px)` }}
            >
              {iframeLoading ? (
                <div className="absolute inset-x-0 top-0 z-10 border-b border-[#c9b88d] bg-[linear-gradient(180deg,#f6edd4_0%,#eadbb6_100%)] px-5 py-2 text-[12px] text-[#5b4b2f]">
                  Loading website... If it stays blank, the site is blocking embeds. Use{" "}
                  <span className="font-bold">Open ↗</span>.
                </div>
              ) : null}

              <iframe
                key={current.url}
                src={current.url}
                className="h-full w-full"
                referrerPolicy="no-referrer"
                onLoad={() => setIframeLoading(false)}
                title={current.title || "Bum-bleUpon page"}
              />
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#f8f1d7,transparent_30%),linear-gradient(180deg,#f7f2df_0%,#e8dcc0_100%)] text-[#5b4b2f] px-6"
              style={{ height: `calc(100vh - ${overlayHeight}px)` }}
            >
              <div className="max-w-2xl text-center">
                <div className="mb-4 rounded-md border border-[#c9b88d] bg-white/50 px-4 py-3 text-[12px] font-bold">
                  Okay, listen. It isn’t the early 2000’s anymore.
                </div>
                <div className="mb-5 text-sm opacity-80">
                  Some websites don’t let us embed them in iframes anymore. So
                  we’re going to have to do this the old-fashioned way.
                  <br />
                  <span className="font-bold">Click Open ↗</span> to view it in a
                  new tab.
                  <br />
                  Come back when you’re done.
                </div>
                <a
                  href={current.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl border border-[#4a8b10] bg-gradient-to-b from-[#9af53c] via-[#71cd1f] to-[#4ea90e] px-6 py-3 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_1px_0_rgba(0,0,0,0.15)]"
                >
                  Open ↗
                </a>
              </div>
            </div>
          )
        ) : (
          <div
            className="flex items-center justify-center bg-[radial-gradient(circle_at_top,#f8f1d7,transparent_30%),linear-gradient(180deg,#f7f2df_0%,#e8dcc0_100%)] text-[#5b4b2f]"
            style={{ height: `calc(100vh - ${overlayHeight}px)` }}
          >
            Summoning the first Bum-ble...
          </div>
        )}
      </div>
    </main>
  );
}