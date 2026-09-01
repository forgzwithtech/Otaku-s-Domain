import { useState } from "react";
import { Link } from "react-router-dom";
import type { GuildType as AppGuildType } from "../App";
import GlobalBackground from "../components/GlobalBackground";
import Login from "../components/Login";
import Register from "../components/Register";

interface AuthGatewayProps {
  guild?: AppGuildType | "none";
}

// Added the Purple theme for unauthenticated/unaligned users
const GUILD_THEMES = {
  purple: { primary: "#a855f7", secondary: "#4c1d95" }, // Unaligned Default
  blue: { primary: "#6bb5ff", secondary: "#1a4a9c" },
  red: { primary: "#FF2E4D", secondary: "#FFE14D" },
};

export default function AuthGateway({ guild }: AuthGatewayProps) {
  // Fallback to purple if no guild is recognized or selected
  const activeTheme = GUILD_THEMES[guild as keyof typeof GUILD_THEMES] || GUILD_THEMES.purple;
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div
      className="h-dvh w-full overflow-hidden flex flex-col relative z-0 transition-colors duration-700"
      style={{
        "--guild-primary": activeTheme.primary,
        "--guild-secondary": activeTheme.secondary,
      } as React.CSSProperties}
    >
      <GlobalBackground />

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 md:px-6 py-4 md:py-6">
        <div className="w-full max-w-6xl h-full max-h-[680px] flex flex-col">

          {/* Back to home */}
          <Link
            to="/"
            className="mb-3 self-start text-white/50 hover:text-white text-[11px] uppercase tracking-widest font-bold flex items-center gap-2 transition-colors shrink-0"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            ← Back to Domain
          </Link>

          {/* THE BOOK */}
          <div className="ink-box-auth bg-[#e8e4d8] shadow-[12px_12px_0px_#000] relative overflow-hidden grid grid-cols-1 lg:grid-cols-2 flex-1 min-h-0">

            {/* LEFT — COVER PANEL */}
            <div
              className="relative hidden lg:flex flex-col justify-between p-8 xl:p-10 overflow-hidden transition-colors duration-700"
              style={{ backgroundColor: "var(--guild-secondary)" }}
            >
              <div className="absolute inset-0 opacity-30 halftone-auth-dark pointer-events-none mix-blend-multiply" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />

              <div className="relative z-10">
                <span
                  className="inline-block bg-black text-white font-bold uppercase text-[10px] px-3 py-1 ink-box-auth rotate-[-2deg] shadow-[3px_3px_0px_var(--guild-primary)] transition-shadow duration-700"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  Vol. 1 // Entry Point
                </span>
              </div>

              <div className="relative z-10">
                <h1
                  className="uppercase text-5xl xl:text-6xl leading-[0.85] text-white tracking-tighter mb-4"
                  style={{ fontFamily: "'Anton', sans-serif", textShadow: "4px 4px 0px #000" }}
                >
                  Otaku's <br />
                  <span className="transition-colors duration-700" style={{ color: "var(--guild-primary)", WebkitTextStroke: "2px black" }}>Domain</span>
                </h1>
                <p
                  className="text-white/80 font-bold text-xs xl:text-sm max-w-xs border-l-4 border-white/40 pl-4 leading-relaxed"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  Pick a guild. Pledge allegiance. Enter the vault. Your arc starts on the next page.
                </p>
              </div>

              <div
                className="relative z-10 vertical-jp-auth text-white/10 font-black text-[8rem] absolute -right-6 -bottom-8 select-none pointer-events-none"
              >
                認証
              </div>
            </div>

            {/* RIGHT — FORM PANEL */}
            <div className="relative bg-[#e8e4d8] p-6 md:p-8 flex flex-col overflow-hidden min-h-0">
              <div className="absolute inset-0 opacity-20 halftone-auth-light pointer-events-none" />

              {/* MODE TABS — VS Style Switch */}
              <div className="relative z-10 flex mb-5 ink-box-auth bg-white shadow-[5px_5px_0px_#000] overflow-hidden shrink-0">
                <button
                  onClick={() => setMode("login")}
                  className={`flex-1 py-3 uppercase text-base tracking-wide transition-all ${
                    mode === "login" ? "bg-black text-white" : "bg-white text-black hover:bg-black/5"
                  }`}
                  style={{ fontFamily: "'Anton', sans-serif" }}
                >
                  Sign In
                </button>
                <div className="w-[3px] bg-black shrink-0" />
                <button
                  onClick={() => setMode("register")}
                  className={`flex-1 py-3 uppercase text-base tracking-wide transition-all ${
                    mode === "register" ? "bg-black text-white" : "bg-white text-black hover:bg-black/5"
                  }`}
                  style={{ fontFamily: "'Anton', sans-serif" }}
                >
                  Register
                </button>
              </div>

              <div className="relative z-10 flex-1 min-h-0 overflow-y-auto no-scrollbar">
                {mode === "login" ? (
                  <Login onSwitch={() => setMode("register")} />
                ) : (
                  <Register onSwitch={() => setMode("login")} />
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}