import { useState, type FormEvent } from "react";
import { scheduleDailyTrial } from "../../services/adminApi";

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

export default function TrialScheduler() {
  const [question, setQuestion] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [rewardPoints, setRewardPoints] = useState(50);
  const [activeDate, setActiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await scheduleDailyTrial({ question, correctAnswer, rewardPoints, activeDate });
      setStatus(res.message || "Trial successfully scheduled!");
      setQuestion("");
      setCorrectAnswer("");
    } catch {
      setStatus("Failed to schedule trial.");
    }
  };

  return (
    <div className="border-4 border-black bg-white p-6 md:p-8 shadow-[10px_10px_0px_#000] mb-8">
      <div className="mb-6 pb-4 border-b-2 border-black">
        <span className="text-xs font-bold text-zinc-500 uppercase" style={{ fontFamily: F_MONO }}>
          DAILY PROTOCOL
        </span>
        <h2 className="text-3xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
          Schedule Daily Trivia Trial
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-2xl" style={{ fontFamily: F_MONO }}>
        <div>
          <label className="text-xs font-bold uppercase block mb-1">Target Active Date (UTC)</label>
          <input
            type="date"
            value={activeDate}
            onChange={(e) => setActiveDate(e.target.value)}
            className="w-full bg-[#e8e4d8] border-2 border-black p-2 text-xs font-bold"
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase block mb-1">Trivia Question</label>
          <input
            type="text"
            placeholder="e.g. Who forged Ichigo's dual Zangetsu?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full bg-[#e8e4d8] border-2 border-black p-2 text-xs font-bold"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase block mb-1">Exact Match Answer</label>
            <input
              type="text"
              placeholder="e.g. Oetsu Nimaiya"
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              className="w-full bg-[#e8e4d8] border-2 border-black p-2 text-xs font-bold"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase block mb-1">Reward QP</label>
            <input
              type="number"
              value={rewardPoints}
              onChange={(e) => setRewardPoints(parseInt(e.target.value, 10))}
              className="w-full bg-[#e8e4d8] border-2 border-black p-2 text-xs font-bold"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="bg-black text-white px-6 py-3 border-2 border-black font-black uppercase text-sm hover:bg-yellow-400 hover:text-black transition-colors self-start mt-2 shadow-[4px_4px_0px_#000]"
          style={{ fontFamily: F_DISPLAY }}
        >
          Publish Trial To Matrix
        </button>

        {status && <span className="text-xs font-bold text-green-600 uppercase">{status}</span>}
      </form>
    </div>
  );
}