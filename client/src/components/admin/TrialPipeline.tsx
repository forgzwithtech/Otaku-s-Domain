import { useState, useEffect, type FormEvent } from "react";
import { fetchAdminTrials, saveAdminTrial, deleteAdminTrial } from "../../services/adminApi";

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

export default function TrialPipeline() {
  const [trials, setTrials] = useState<any[]>([]);
  const [editingTrial, setEditingTrial] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const initialForm = {
    question: "",
    correctAnswer: "",
    rewardPoints: 50,
    activeDate: new Date().toISOString().split("T")[0],
  };
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminTrials();
      setTrials(data.trials || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleEdit = (trial: any) => {
    setEditingTrial(trial);
    setForm({
      question: trial.question,
      correctAnswer: trial.correctAnswer,
      rewardPoints: trial.rewardPoints,
      activeDate: new Date(trial.activeDate).toISOString().split("T")[0],
    });
  };

  const handleCancel = () => {
    setEditingTrial(null);
    setForm(initialForm);
    setStatus(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await saveAdminTrial(editingTrial ? { ...form, id: editingTrial.id } : form);
      setStatus(res.message || "Saved successfully.");
      handleCancel();
      load();
    } catch {
      setStatus("Failed to save trial.");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this scheduled trial?")) {
      await deleteAdminTrial(id);
      load();
    }
  };

  // Compare using matching local representations so the badge aligns with the date label
  const todayLocalStr = new Date().toLocaleDateString();

  return (
    <div className="border-4 border-black bg-white p-6 md:p-8 shadow-[10px_10px_0px_#000] mb-8">
      <div className="mb-6 pb-4 border-b-2 border-black">
        <span className="text-xs font-bold text-zinc-500 uppercase" style={{ fontFamily: F_MONO }}>
          DAILY TRIVIA TIMELINE
        </span>
        <h2 className="text-3xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
          Daily Trials Schedule & Pipeline ({trials.length})
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upsert Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-5 flex flex-col gap-3 bg-[#e8e4d8] border-2 border-black p-5 shadow-[4px_4px_0px_#000]" style={{ fontFamily: F_MONO }}>
          <h3 className="text-xl uppercase font-black mb-1" style={{ fontFamily: F_DISPLAY }}>
            {editingTrial ? `Edit Trial #${editingTrial.id}` : "Schedule New Trial"}
          </h3>

          <div>
            <label className="text-[10px] font-black uppercase text-zinc-600 block mb-1">Active Date</label>
            <input
              type="date"
              value={form.activeDate}
              onChange={(e) => setForm({ ...form, activeDate: e.target.value })}
              className="w-full p-2 border border-black text-xs font-bold bg-white"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-zinc-600 block mb-1">Trivia Question</label>
            <textarea
              placeholder="e.g. Who forged Ichigo Kurosaki's true dual Zangetsu blades?"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              className="w-full p-2 border border-black text-xs font-bold bg-white h-20 resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-black uppercase text-zinc-600 block mb-1">Answer (Exact Match)</label>
              <input
                type="text"
                placeholder="e.g. Oetsu Nimaiya"
                value={form.correctAnswer}
                onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
                className="w-full p-2 border border-black text-xs font-bold bg-white"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-zinc-600 block mb-1">Reward QP</label>
              <input
                type="number"
                value={form.rewardPoints}
                onChange={(e) => setForm({ ...form, rewardPoints: parseInt(e.target.value, 10) || 50 })}
                className="w-full p-2 border border-black text-xs font-bold bg-white"
                required
              />
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              className="flex-1 bg-black text-white p-2.5 font-black uppercase text-xs hover:bg-yellow-400 hover:text-black transition-colors"
              style={{ fontFamily: F_DISPLAY }}
            >
              {editingTrial ? "Update Trial" : "Schedule Trial"}
            </button>
            {editingTrial && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 bg-zinc-300 text-black font-bold uppercase text-xs border border-black"
              >
                Cancel
              </button>
            )}
          </div>
          {status && <span className="text-xs font-bold text-green-600 uppercase mt-1">{status}</span>}
        </form>

        {/* Schedule List */}
        <div className="lg:col-span-7 flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2" style={{ fontFamily: F_MONO }}>
          {loading ? (
            <div className="text-xs uppercase font-bold text-zinc-500 p-8 text-center">Loading trials...</div>
          ) : trials.length > 0 ? (
            trials.map((t) => {
              const trialLocalDateStr = new Date(t.activeDate).toLocaleDateString();
              const isToday = trialLocalDateStr === todayLocalStr;

              return (
                <div key={t.id} className={`border-2 border-black p-4 bg-white flex justify-between items-center shadow-[3px_3px_0px_#000] ${isToday ? "border-l-8 border-l-red-600 bg-yellow-50" : ""}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase">
                        {trialLocalDateStr}
                      </span>
                      {isToday && <span className="bg-red-600 text-white px-2 py-0.5 text-[10px] font-black uppercase">ACTIVE TODAY</span>}
                      <span className="text-yellow-600 font-bold text-xs">+{t.rewardPoints} QP</span>
                    </div>
                    <h4 className="text-sm font-black text-black mt-1">{t.question}</h4>
                    <span className="text-[11px] text-zinc-500 block">Answer: <strong className="text-black">{t.correctAnswer}</strong></span>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleEdit(t)}
                      className="px-3 py-1 bg-black text-white hover:bg-yellow-400 hover:text-black text-xs font-bold uppercase"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="px-3 py-1 bg-red-600 text-white hover:bg-black text-xs font-bold uppercase"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-xs uppercase font-bold text-zinc-500 p-8 text-center">No trials recorded in matrix.</div>
          )}
        </div>
      </div>
    </div>
  );
}