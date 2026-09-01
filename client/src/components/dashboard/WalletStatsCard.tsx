// src/components/dashboard/WalletStatsCard.tsx
interface WalletStatsProps {
  questPoints: number;
  eventCredits: number;
}

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

export default function WalletStatsCard({ questPoints, eventCredits }: WalletStatsProps) {
  const level = Math.floor(questPoints / 100) + 1;
  const progress = questPoints % 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {/* QUEST POINTS — leveled XP window */}
      <div className="ink-box-dash bg-zinc-900 p-6 shadow-[8px_8px_0px_#000] relative overflow-hidden group hover:-translate-y-1 transition-transform">
        <div className="absolute inset-0 opacity-10 halftone-dash-light pointer-events-none" />
        <div className="absolute inset-0 focus-lines-dash opacity-10 pointer-events-none mix-blend-screen" />
        <div className="absolute -right-6 -top-6 text-[7rem] leading-none opacity-10 select-none pointer-events-none">⚡</div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-[10px] uppercase font-bold px-2 py-0.5 jagged-tag-dash inline-block shadow-[2px_2px_0px_var(--guild-primary)]"
              style={{ fontFamily: F_MONO, color: "var(--guild-primary)", borderColor: "var(--guild-primary)" }}
            >
              Earned Engagement
            </span>
            <span
              className="text-[11px] font-black px-2 py-0.5 bg-black border-2 rotate-2 shadow-[2px_2px_0px_#000]"
              style={{ fontFamily: F_DISPLAY, color: "var(--guild-primary)", borderColor: "var(--guild-primary)" }}
            >
              LV {level}
            </span>
          </div>

          <h3 className="text-6xl uppercase text-white leading-none" style={{ fontFamily: F_DISPLAY }}>
            {questPoints}
            <span className="text-base font-bold ml-2 text-white/50" style={{ fontFamily: F_MONO }}>QP</span>
          </h3>

          {/* XP bar */}
          <div className="mt-4 h-3 w-full bg-black/60 border-2 border-white/20 relative overflow-hidden">
            <div
              className="h-full relative overflow-hidden transition-all duration-700"
              style={{ width: `${progress}%`, backgroundColor: "var(--guild-primary)" }}
            >
              <div className="absolute inset-0 xp-fill-dash" />
            </div>
          </div>
          <p className="text-[10px] font-bold text-white/40 mt-1 uppercase tracking-widest" style={{ fontFamily: F_MONO }}>
            {progress} / 100 to Lv {level + 1}
          </p>

          <p className="text-xs font-bold text-white/50 mt-3 max-w-[85%]" style={{ fontFamily: F_MONO }}>
            Use Quest Points to issue custom bounties and forum quests.
          </p>
        </div>
      </div>

      {/* EVENT CREDITS */}
      <div className="ink-box-dash bg-white p-6 shadow-[8px_8px_0px_#000] relative overflow-hidden group hover:-translate-y-1 transition-transform">
        <div className="absolute inset-0 opacity-15 halftone-dash-dark pointer-events-none" />
        <div className="absolute -right-6 -top-6 text-[7rem] leading-none opacity-[0.06] select-none pointer-events-none">₦</div>

        <div className="relative z-10">
          <span
            className="text-[10px] uppercase font-bold px-2 py-0.5 jagged-tag-dash inline-block mb-3 bg-black text-white shadow-[2px_2px_0px_#000]"
            style={{ fontFamily: F_MONO }}
          >
            Event Commerce
          </span>
          <h3 className="text-6xl uppercase text-black leading-none" style={{ fontFamily: F_DISPLAY }}>
            ₦{eventCredits.toLocaleString()}
          </h3>
          <p className="text-xs font-bold text-black/60 mt-3 max-w-[85%]" style={{ fontFamily: F_MONO }}>
            Event Credits ready for ticket pre-sales and booth slotting.
          </p>
        </div>
      </div>

    </div>
  );
}