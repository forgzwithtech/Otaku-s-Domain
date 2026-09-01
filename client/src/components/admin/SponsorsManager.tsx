import { useState, useEffect, type FormEvent } from "react";
import { fetchAdminSponsors, saveAdminSponsor, deleteAdminSponsor } from "../../services/adminApi";

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

export default function SponsorManager() {
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", role: "Official Guild Partner", websiteUrl: "", displayOrder: 1 });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminSponsors();
      setSponsors(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await saveAdminSponsor(form);
    setForm({ name: "", role: "Official Guild Partner", websiteUrl: "", displayOrder: sponsors.length + 1 });
    load();
  };

  const handleDelete = async (id: number) => {
    if (confirm("Remove this sponsor?")) {
      await deleteAdminSponsor(id);
      load();
    }
  };

  return (
    <div className="border-4 border-black bg-white p-6 md:p-8 shadow-[10px_10px_0px_#000] mb-8">
      <div className="mb-6 pb-4 border-b-2 border-black">
        <span className="text-xs font-bold text-zinc-500 uppercase" style={{ fontFamily: F_MONO }}>
          COMMERCIAL PARTNERSHIPS
        </span>
        <h2 className="text-3xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
          Sponsors & Brand Registry ({sponsors.length})
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-5 flex flex-col gap-3 bg-[#e8e4d8] border-2 border-black p-5 shadow-[4px_4px_0px_#000]" style={{ fontFamily: F_MONO }}>
          <h3 className="text-xl uppercase font-black mb-1" style={{ fontFamily: F_DISPLAY }}>Add Sponsor / Partner</h3>

          <input
            type="text"
            placeholder="Sponsor Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="p-2 border border-black text-xs font-bold bg-white"
            required
          />

          <input
            type="text"
            placeholder="Role (e.g. Official Guild Partner)"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="p-2 border border-black text-xs font-bold bg-white"
            required
          />

          <input
            type="url"
            placeholder="Website URL (https://...)"
            value={form.websiteUrl}
            onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
            className="p-2 border border-black text-xs font-bold bg-white"
            required
          />

          <input
            type="number"
            placeholder="Display Order"
            value={form.displayOrder}
            onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value, 10) || 1 })}
            className="p-2 border border-black text-xs font-bold bg-white"
            required
          />

          <button
            type="submit"
            className="bg-black text-white p-2.5 font-black uppercase text-xs hover:bg-yellow-400 hover:text-black transition-colors mt-2"
            style={{ fontFamily: F_DISPLAY }}
          >
            + Register Sponsor
          </button>
        </form>

        <div className="lg:col-span-7 flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2" style={{ fontFamily: F_MONO }}>
          {loading ? (
            <div className="text-xs uppercase font-bold text-zinc-500 p-8 text-center">Loading sponsors...</div>
          ) : sponsors.length > 0 ? (
            sponsors.map((s) => (
              <div key={s.id} className="border-2 border-black p-4 bg-white flex justify-between items-center shadow-[3px_3px_0px_#000]">
                <div>
                  <span className="bg-black text-white px-1.5 py-0.5 text-[10px] font-black uppercase">#{s.displayOrder}</span>
                  <h4 className="text-lg uppercase font-black mt-1" style={{ fontFamily: F_DISPLAY }}>{s.name}</h4>
                  <span className="text-xs text-zinc-600 block">{s.role}</span>
                  <a href={s.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 underline">
                    {s.websiteUrl}
                  </a>
                </div>

                <button
                  onClick={() => handleDelete(s.id)}
                  className="px-3 py-1 bg-red-600 text-white hover:bg-black text-xs font-bold uppercase"
                >
                  ✕
                </button>
              </div>
            ))
          ) : (
            <div className="text-xs uppercase font-bold text-zinc-500 p-8 text-center">No sponsors registered.</div>
          )}
        </div>
      </div>
    </div>
  );
}