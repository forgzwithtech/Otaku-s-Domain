const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

interface TelemetryProps {
  stats: {
    totalUsers: number;
    guilds: { blueCount: number; redCount: number; unalignedCount: number };
    adultCleared: number;
    pendingRecruits: number;
    totalQpInCirculation: number;
  } | null;
}

export default function AdminTelemetry({ stats }: TelemetryProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="border-4 border-black bg-white p-5 shadow-[6px_6px_0px_#000]">
        <span className="text-xs font-bold text-zinc-500 uppercase block mb-1" style={{ fontFamily: F_MONO }}>
          TOTAL OPERATIVES
        </span>
        <h3 className="text-4xl font-black uppercase text-black" style={{ fontFamily: F_DISPLAY }}>
          {stats.totalUsers}
        </h3>
        <span className="text-[10px] font-bold text-zinc-600 uppercase mt-1 block" style={{ fontFamily: F_MONO }}>
          {stats.adultCleared} Clearance 18+
        </span>
      </div>

      <div className="border-4 border-black bg-white p-5 shadow-[6px_6px_0px_#000]">
        <span className="text-xs font-bold text-zinc-500 uppercase block mb-1" style={{ fontFamily: F_MONO }}>
          FACTION BALANCE
        </span>
        <div className="flex justify-between items-baseline">
          <span className="text-2xl font-black text-blue-600" style={{ fontFamily: F_DISPLAY }}>
            AZURE: {stats.guilds.blueCount}
          </span>
          <span className="text-2xl font-black text-red-600" style={{ fontFamily: F_DISPLAY }}>
            CRIMSON: {stats.guilds.redCount}
          </span>
        </div>
        <span className="text-[10px] font-bold text-zinc-600 uppercase mt-1 block" style={{ fontFamily: F_MONO }}>
          {stats.guilds.unalignedCount} Unaligned
        </span>
      </div>

      <div className="border-4 border-black bg-white p-5 shadow-[6px_6px_0px_#000]">
        <span className="text-xs font-bold text-zinc-500 uppercase block mb-1" style={{ fontFamily: F_MONO }}>
          GLOBAL QP POOL
        </span>
        <h3 className="text-4xl font-black uppercase text-yellow-500" style={{ fontFamily: F_DISPLAY }}>
          {stats.totalQpInCirculation.toLocaleString()} QP
        </h3>
        <span className="text-[10px] font-bold text-zinc-600 uppercase mt-1 block" style={{ fontFamily: F_MONO }}>
          In Circulation
        </span>
      </div>

      <div className="border-4 border-black bg-white p-5 shadow-[6px_6px_0px_#000]">
        <span className="text-xs font-bold text-zinc-500 uppercase block mb-1" style={{ fontFamily: F_MONO }}>
          CASTING PIPELINE
        </span>
        <h3 className="text-4xl font-black uppercase text-black" style={{ fontFamily: F_DISPLAY }}>
          {stats.pendingRecruits}
        </h3>
        <span className="text-[10px] font-bold text-zinc-600 uppercase mt-1 block" style={{ fontFamily: F_MONO }}>
          Creator Submissions
        </span>
      </div>
    </div>
  );
}