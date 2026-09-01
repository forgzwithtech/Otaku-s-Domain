// src/components/forum/GenderGatekeeperModal.tsx
import { useState, useEffect, type FormEvent } from "react";
import { setOperativeGender } from "../../services/forumApi";

const F_DISPLAY = "'Anton', sans-serif";
const F_SFX = "'Bangers', cursive";
const F_MONO = "'Space Mono', monospace";

function useGatekeeperMangaAssets() {
  useEffect(() => {
    if (document.getElementById("gatekeeper-manga-assets")) return;
    const style = document.createElement("style");
    style.id = "gatekeeper-manga-assets";
    style.innerHTML = `
      .ink-box-gate {
        border: 4px solid #000;
        border-radius: 2px 255px 3px 255px / 255px 5px 225px 3px;
      }
      .halftone-gate-dark {
        background-image: radial-gradient(rgba(0,0,0,0.6) 1.5px, transparent 1.5px);
        background-size: 6px 6px;
      }
      .jagged-tag-gate {
        clip-path: polygon(0% 15%, 8% 0%, 92% 0%, 100% 15%, 100% 85%, 92% 100%, 8% 100%, 0% 85%);
      }
      .vertical-jp-gate {
        writing-mode: vertical-rl;
        text-orientation: upright;
        font-family: 'Noto Sans JP', sans-serif;
      }
    `;
    document.head.appendChild(style);
  }, []);
}

interface Props {
  onSuccess: (gender: string) => void;
  onCancel?: () => void;
}

export default function GenderGatekeeperModal({ onSuccess, onCancel }: Props) {
  useGatekeeperMangaAssets();
  const [selectedGender, setSelectedGender] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedGender) {
      setError("Please select a gender identity to proceed.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await setOperativeGender(selectedGender);
      if (res.success) {
        onSuccess(selectedGender);
      } else {
        setError(res.message || "Failed to register identity.");
      }
    } catch {
      setError("Server connection error.");
    } finally {
      setLoading(false);
    }
  };

  const options = [
    { label: "Male Operative", icon: "👨", value: "Male" },
    { label: "Female Operative", icon: "👩", value: "Female" },
    { label: "Non-Binary", icon: "⚡", value: "NonBinary" },
    { label: "Other / Custom", icon: "✨", value: "Other" },
  ];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="ink-box-gate bg-[#e8e4d8] p-6 md:p-8 max-w-lg w-full shadow-[14px_14px_0px_#000] relative overflow-hidden">
        <div className="absolute inset-0 opacity-15 halftone-gate-dark pointer-events-none" />
        <div className="absolute -right-6 -bottom-10 vertical-jp-gate text-black/5 font-black text-[8rem] tracking-widest pointer-events-none select-none leading-none">
          身分
        </div>
        <div
          className="hidden sm:block absolute top-3 right-4 select-none pointer-events-none rotate-[10deg] z-10"
          style={{ fontFamily: F_SFX, color: "var(--guild-primary)", WebkitTextStroke: "1.5px black", fontSize: "1.8rem" }}
        >
          ID!!
        </div>

        <div className="relative z-10 mb-4 pb-3 border-b-2 border-black">
          <span className="text-[10px] font-black uppercase bg-black text-white px-3 py-1 jagged-tag-gate shadow-[3px_3px_0px_var(--guild-primary)]" style={{ fontFamily: F_MONO }}>
            Security Clearance // Operative Identity
          </span>
          <h2 className="text-3xl md:text-4xl uppercase font-black mt-3 text-black tracking-tighter" style={{ fontFamily: F_DISPLAY }}>
            Declare Your <span style={{ WebkitTextStroke: "2px black", color: "white", textShadow: "3px 3px 0px #000" }}>Identity</span>
          </h2>
        </div>

        <p className="relative z-10 text-xs md:text-sm text-zinc-700 font-bold leading-relaxed mb-6 border-l-4 border-black pl-4" style={{ fontFamily: F_MONO }}>
          To mingle, participate in guild discussions, and unlock operative badges in Otaku's Domain forums, you must specify your gender.
        </p>

        <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3" style={{ fontFamily: F_MONO }}>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedGender(opt.value)}
                className={`p-4 ink-box-gate border-2 border-black text-xs font-black uppercase transition-all shadow-[3px_3px_0px_#000] ${
                  selectedGender === opt.value
                    ? "bg-black text-white -translate-y-1 shadow-[5px_5px_0px_var(--guild-primary)]"
                    : "bg-white text-black hover:bg-zinc-100 hover:-translate-y-0.5"
                }`}
              >
                <span className="text-xl block mb-1">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>

          {error && (
            <span className="text-xs font-bold text-red-600 uppercase bg-red-50 border-2 border-red-600 px-3 py-2 jagged-tag-gate" style={{ fontFamily: F_MONO }}>
              ⚠ {error}
            </span>
          )}

          <div className="flex gap-3 mt-2">
            <button
              type="submit"
              disabled={loading || !selectedGender}
              className="flex-1 bg-black text-white p-3.5 font-black uppercase text-sm ink-box-gate border-2 border-black hover:bg-[var(--guild-primary)] hover:text-black disabled:opacity-40 transition-colors shadow-[5px_5px_0px_var(--guild-primary)] active:translate-y-1 active:shadow-none"
              style={{ fontFamily: F_DISPLAY }}
            >
              {loading ? "Registering Clearance..." : "Confirm & Enter Forum ➔"}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 bg-zinc-300 ink-box-gate border-2 border-black text-black font-bold uppercase text-xs hover:bg-zinc-400"
                style={{ fontFamily: F_MONO }}
              >
                Exit
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}