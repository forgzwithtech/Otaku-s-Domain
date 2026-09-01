// src/components/dashboard/DashboardHeader.tsx
import { supabase } from '../../lib/supabase';

interface DashboardHeaderProps {
  displayName: string;
  email: string;
  faction: string;
  avatarUrl?: string;
}

const F_DISPLAY = "'Anton', sans-serif";
const F_SFX = "'Bangers', cursive";
const F_MONO = "'Space Mono', monospace";

export default function DashboardHeader({ displayName, email, faction, avatarUrl }: DashboardHeaderProps) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const isAligned = faction !== 'None';
  const displayAvatar = avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}&backgroundColor=transparent`;

  return (
    <div className="relative pb-3">
      <div className="ink-box-dash bg-[#e8e4d8] p-6 md:p-8 shadow-[10px_10px_0px_#000] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none halftone-dash-dark" />
        <div className="absolute inset-0 speed-diag-dash opacity-40 pointer-events-none mix-blend-multiply" />
        <div className="absolute -right-4 -bottom-10 vertical-jp-dash text-black/5 font-black text-[9rem] tracking-widest pointer-events-none select-none leading-none">
          戦士
        </div>

        {/* SFX burst */}
        <div
          className="hidden md:block absolute top-4 right-8 select-none pointer-events-none rotate-[-8deg] z-10"
          style={{
            fontFamily: F_SFX,
            color: "var(--guild-primary)",
            WebkitTextStroke: "2px black",
            fontSize: "2.5rem",
            filter: "drop-shadow(3px 3px 0px rgba(0,0,0,1))",
          }}
        >
          WELCOME BACK!!
        </div>

        <div className="relative z-10 flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="absolute -inset-3 focus-lines-dash opacity-50 rounded-full pointer-events-none" />
            <div
              className="absolute -inset-1.5 blur-md opacity-80 animate-pulse"
              style={{ backgroundColor: "var(--guild-primary)" }}
            />
            <div className="relative w-20 h-20 bg-zinc-900 border-4 border-black skew-x-[-8deg] overflow-hidden shadow-[4px_4px_0px_var(--guild-primary)] flex items-center justify-center">
              <img
                src={displayAvatar}
                alt="Avatar"
                className="w-full h-full object-cover skew-x-[8deg]"
              />
            </div>
            <div
              className="absolute -bottom-2 -right-2 w-7 h-7 bg-black border-2 border-white text-white flex items-center justify-center font-black text-[10px] rotate-6 shadow-[2px_2px_0px_#000]"
              style={{ fontFamily: F_DISPLAY }}
            >
              {isAligned ? faction[0].toUpperCase() : "?"}
            </div>
          </div>

          <div>
            <span
              className="inline-block bg-black text-white text-[10px] font-bold uppercase px-3 py-1 jagged-tag-dash rotate-[-2deg] shadow-[3px_3px_0px_var(--guild-primary)]"
              style={{ fontFamily: F_MONO }}
            >
              Active Operative // {isAligned ? faction.toUpperCase() : "Unaligned"}
            </span>
            <h1 className="text-3xl md:text-5xl uppercase text-black tracking-tighter mt-2 leading-none" style={{ fontFamily: F_DISPLAY }}>
              @{displayName}
            </h1>
            <p className="text-xs text-black/50 font-bold mt-1" style={{ fontFamily: F_MONO }}>{email}</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="relative z-10 group bg-black text-white uppercase text-sm px-6 py-3 ink-box-dash border-2 border-black hover:bg-red-600 hover:border-red-600 transition-all shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_rgba(220,38,38,0.4)] active:translate-y-1 active:shadow-none flex items-center gap-2 cursor-pointer"
          style={{ fontFamily: F_DISPLAY }}
        >
          <span>Log Out</span>
          <span className="group-hover:translate-x-1 transition-transform">⏻</span>
        </button>
      </div>

      {/* Torn manga page edge */}
      <div className="absolute -bottom-1 left-0 w-full h-4 bg-black zigzag-dash" />
    </div>
  );
}