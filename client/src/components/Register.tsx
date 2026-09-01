import { useState } from "react";
import { supabase } from "../lib/supabase";
import SocialAuthButtons from "./SocialAuthButtons";

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

export default function Register({ onSwitch }: { onSwitch: () => void }) {
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: handle } // Saves the handle to Supabase user metadata
      }
    });

    if (signUpError) {
      setError(signUpError.message);
    } else {
      // Success! Usually triggers an email confirmation depending on Supabase settings
      alert("Registration successful! Check your email or sign in.");
      onSwitch(); 
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleRegister} className="flex flex-col gap-3.5 h-full">
      {error && <div className="text-red-600 bg-red-100 p-2 font-bold text-xs ink-box-auth">{error}</div>}
      
      <div>
        <span className="text-[10px] uppercase font-bold text-black/60 tracking-widest block mb-1.5" style={{ fontFamily: F_MONO }}>
          Display Handle
        </span>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@your_handle"
          required
          className="auth-input w-full px-4 py-3 text-black placeholder-black/30 transition-all"
        />
      </div>

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
        <span className="text-[10px] uppercase font-bold text-black/60 tracking-widest block mb-1.5" style={{ fontFamily: F_MONO }}>
          Password
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="auth-input w-full px-4 py-3 text-black placeholder-black/30 transition-all"
        />
      </div>

      <label className="flex items-start gap-2 text-[10px] font-bold text-black/70" style={{ fontFamily: F_MONO }}>
        <input type="checkbox" required className="mt-0.5 w-3.5 h-3.5 accent-black shrink-0" />
        I agree to the Terms and Merch Policy.
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white uppercase text-lg py-3.5 ink-box-auth hover:bg-[var(--guild-primary)] hover:text-black transition-all shadow-[5px_5px_0px_var(--guild-primary)] hover:shadow-[7px_7px_0px_#000] active:translate-y-1.5 active:shadow-none disabled:opacity-50"
        style={{ fontFamily: F_DISPLAY }}
      >
        {loading ? "Forging Account..." : "Create Account"}
      </button>

      <SocialAuthButtons />

      <p className="text-center text-xs font-bold text-black/60 mt-auto pt-2" style={{ fontFamily: F_MONO }}>
        Already enrolled?{" "}
        <button type="button" onClick={onSwitch} className="underline hover:text-black transition-colors" style={{ color: "var(--guild-secondary)" }}>
          Sign in instead
        </button>
      </p>
    </form>
  );
}