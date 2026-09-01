import { useState, useEffect } from "react";
import { fetchRecruits, deleteRecruit } from "../../services/adminApi";

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

export default function RecruitmentQueue() {
  const [recruits, setRecruits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchRecruits();
      setRecruits(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    await deleteRecruit(id);
    load();
  };

  return (
    <div className="border-4 border-black bg-white p-6 md:p-8 shadow-[10px_10px_0px_#000] mb-8">
      <div className="mb-6 pb-4 border-b-2 border-black">
        <span className="text-xs font-bold text-zinc-500 uppercase" style={{ fontFamily: F_MONO }}>
          CREATOR AUDITIONS
        </span>
        <h2 className="text-3xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
          Recruitment Casting Queue ({recruits.length})
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" style={{ fontFamily: F_MONO }}>
        {loading ? (
          <div className="text-xs font-bold uppercase text-zinc-500">Querying submissions...</div>
        ) : recruits.length > 0 ? (
          recruits.map((r) => (
            <div key={r.id} className="border-2 border-black p-4 bg-[#e8e4d8] flex justify-between items-center shadow-[3px_3px_0px_#000]">
              <span className="font-black text-sm uppercase">{r.handle}</span>
              <button
                onClick={() => handleDelete(r.id)}
                className="bg-red-600 text-white px-2.5 py-1 text-[10px] font-black uppercase hover:bg-black transition-colors"
              >
                Clear ✕
              </button>
            </div>
          ))
        ) : (
          <div className="text-xs font-bold uppercase text-zinc-500">No pending casting applications.</div>
        )}
      </div>
    </div>
  );
}