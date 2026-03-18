import Link from "next/link";

export default function HomePage() {
  return (
    <main
      className="min-h-screen bg-[#7f8b93] text-[#2a2a2a]"
      style={{ fontFamily: "Verdana, Tahoma, sans-serif" }}
    >
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 rounded-xl border border-[#6f777e] bg-white shadow-2xl overflow-hidden">
          <div className="border-b border-[#9da0a6] bg-gradient-to-b from-[#f3f3f5] via-[#dedfe3] to-[#c8ccd2] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold">
              <div className="rounded-md border border-[#a4a8ad] bg-white/70 px-3 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                BUM-BLEUPON
              </div>

              <button className="rounded-md border border-[#8e9398] bg-gradient-to-b from-[#ffffff] to-[#d8dde2] px-2 py-1 text-[#4b5563] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
                ◀
              </button>

              <Link
                href="/stumble"
                className="rounded-xl border border-[#4a8b10] bg-gradient-to-b from-[#9af53c] via-[#71cd1f] to-[#4ea90e] px-5 py-1.5 text-[14px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_1px_0_rgba(0,0,0,0.15)]"
              >
                BUM-BLE!
              </Link>

              <button className="rounded-md border border-[#8e9398] bg-gradient-to-b from-[#ffffff] to-[#d8dde2] px-2 py-1 text-[#4b5563] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
                ▶
              </button>

              <div className="ml-2 flex items-center gap-1">
                <button className="rounded-md border border-[#d7a21d] bg-gradient-to-b from-[#ffe189] to-[#f0c84a] px-3 py-1 text-[#6b4a00] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                  ★ Save
                </button>
                <button className="rounded-md border border-[#a4a8ad] bg-gradient-to-b from-[#ffffff] to-[#d8dde2] px-3 py-1 text-[#4b5563] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
                  👍
                </button>
                <button className="rounded-md border border-[#a4a8ad] bg-gradient-to-b from-[#ffffff] to-[#d8dde2] px-3 py-1 text-[#4b5563] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
                  👎
                </button>
                <button className="rounded-md border border-[#a4a8ad] bg-gradient-to-b from-[#ffffff] to-[#d8dde2] px-3 py-1 text-[#4b5563] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
                  Share
                </button>
              </div>

              <div className="ml-auto rounded-md border border-[#a4a8ad] bg-white/75 px-3 py-1 text-[12px] font-normal text-[#334155]">
                Random internet gold · Ready to stumble
              </div>
            </div>
          </div>

          <div className="border-b border-[#c9b88d] bg-[linear-gradient(180deg,#f6edd4_0%,#eadbb6_100%)] px-5 py-3 text-[12px] text-[#5b4b2f]">
            <span className="font-bold">Now stumbling:</span> Welcome back to the old
            internet. One click from another corner of the web.
          </div>

          <div className="bg-[radial-gradient(circle_at_top,#f8f1d7,transparent_30%),linear-gradient(180deg,#f7f2df_0%,#e8dcc0_100%)] px-8 py-14 text-[#4b3d2b]">
            <div className="mb-3 inline-block rounded-full border border-[#b48c3f] bg-[#f9e08a] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b4a00]">
              curated internet wandering
            </div>

            <h1 className="mb-4 text-5xl font-black tracking-tight">
              Bum-bleUpon
            </h1>

            <p className="max-w-3xl text-lg leading-8 opacity-80">
              A quieter kind of internet. Back when clicking a link could take you
              anywhere. No feeds. No pressure. Just curiosity.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/stumble"
                className="rounded-xl border border-[#4a8b10] bg-gradient-to-b from-[#9af53c] via-[#71cd1f] to-[#4ea90e] px-6 py-3 text-lg font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_1px_0_rgba(0,0,0,0.15)]"
              >
                Start Bum-bling
              </Link>

              <div className="rounded-md border border-[#c9b88d] bg-white/50 px-4 py-3 text-sm text-[#5b4b2f]">
                One click, and you’re somewhere new.
              </div>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-black/10 bg-white/50 p-4">
                <div className="mb-2 text-sm font-bold">Just explore</div>
                <div className="text-sm opacity-70">
                  No endless scrolling. No trying to keep up. Just follow where the
                  next click takes you.
                </div>
              </div>

              <div className="rounded-lg border border-black/10 bg-white/40 p-4">
                <div className="mb-2 text-sm font-bold">Thoughtfully chosen</div>
                <div className="text-sm opacity-70">
                  Every link is added with care. Strange, useful, beautiful, or just
                  interesting.
                </div>
              </div>

              <div className="rounded-lg border border-black/10 bg-white/30 p-4">
                <div className="mb-2 text-sm font-bold">Take your time</div>
                <div className="text-sm opacity-70">
                  Stay as long as you like. There’s nowhere else you need to be.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}