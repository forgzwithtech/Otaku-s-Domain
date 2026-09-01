import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import SocialAuthButtons from "./SocialAuthButtons";

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

function useAuthAssets() {
  useEffect(() => {
    if (document.getElementById("auth-manga-assets")) return;
    const style = document.createElement("style");
    style.id = "auth-manga-assets";
    style.innerHTML = `
      .ink-box-auth {
        border: 4px solid #000;
        border-radius: 2px 255px 3px 255px / 255px 5px 225px 3px;
      }
      .halftone-auth-dark {
        background-image: radial-gradient(rgba(0,0,0,0.6) 1.5px, transparent 1.5px);
        background-size: 6px 6px;
      }
      .halftone-auth-light {
        background-image: radial-gradient(rgba(0,0,0,0.4) 1.5px, transparent 1.5px);
        background-size: 8px 8px;
      }
      .vertical-jp-auth {
        writing-mode: vertical-rl;
        text-orientation: upright;
        font-family: 'Noto Sans JP', sans-serif;
      }
      .auth-input {
        border: 3px solid #000;
        background: #fff;
        font-family: 'Space Mono', monospace;
        font-weight: 700;
      }
      .auth-input:focus {
        outline: none;
        box-shadow: 4px 4px 0px var(--guild-primary);
        transform: translate(-2px, -2px);
      }
      .no-scrollbar {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .no-scrollbar::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
      }
    `;
    document.head.appendChild(style);
  }, []);
}

export default function Login({ onSwitch }: { onSwitch: () => void }) {
  useAuthAssets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
    } else {
      // Force redirect or state update to dashboard upon successful login
      window.location.href = "/dashboard";
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-4 h-full">
      {error && <div className="text-red-600 bg-red-100 p-2 font-bold text-xs ink-box-auth">{error}</div>}
      
      <div>
        <span className="text-[10px] uppercase font-bold text-black/60 tracking-widest block mb-1.5" style={{ fontFamily: F_MONO }}>
          Email
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          required
          className="auth-input w-full px-4 py-3 text-black placeholder-black/30 transition-all"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] uppercase font-bold text-black/60 tracking-widest" style={{ fontFamily: F_MONO }}>
            Password
          </span>
          <button type="button" className="text-[10px] uppercase font-bold tracking-widest hover:underline transition-colors" style={{ fontFamily: F_MONO, color: "var(--guild-secondary)" }}>
            Forgot?
          </button>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="auth-input w-full px-4 py-3 text-black placeholder-black/30 transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-1 w-full bg-black text-white uppercase text-lg py-3.5 ink-box-auth hover:bg-[var(--guild-primary)] hover:text-black transition-all shadow-[5px_5px_0px_var(--guild-primary)] hover:shadow-[7px_7px_0px_#000] active:translate-y-1.5 active:shadow-none disabled:opacity-50"
        style={{ fontFamily: F_DISPLAY }}
      >
        {loading ? "Authenticating..." : "Enter the Domain"}
      </button>

      <SocialAuthButtons />

      <p className="text-center text-xs font-bold text-black/60 mt-auto pt-3" style={{ fontFamily: F_MONO }}>
        No account yet?{" "}
        <button type="button" onClick={onSwitch} className="underline hover:text-black transition-colors" style={{ color: "var(--guild-secondary)" }}>
          Start your arc
        </button>
      </p>
    </form>
  );
}