import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { apiService } from "../services/api";
import blue from "../assets/bluelogo.png";
import red from "../assets/RedlogoDark.png";

const CRIMSON_WHATSAPP = "https://chat.whatsapp.com/FDo5tGlmB6UIwVBwXVPWmZ";
const AZURE_WHATSAPP = "https://chat.whatsapp.com/KS0zIlF6D1v6fy41Ssui3k";

interface SponsorData {
  id: number;
  name: string;
  role: string;
  websiteUrl: string;
}

const FALLBACK_SPONSORS: SponsorData[] = [
  { id: 1, name: "CRUNCHYROLL", role: "Streaming Partner", websiteUrl: "https://www.crunchyroll.com" },
  { id: 2, name: "BANDAI NAMCO", role: "Gaming Ally", websiteUrl: "https://www.bandainamcoent.com" },
  { id: 3, name: "KODANSHA", role: "Publishing Sponsor", websiteUrl: "https://kodansha.us" },
  { id: 4, name: "MAPPA STUDIOS", role: "Animation Partner", websiteUrl: "https://www.mappa.co.jp" },
];

function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  );
}

function useGuildMangaAssets() {
  useEffect(() => {
    if (document.getElementById("guild-manga-assets")) return;
    const style = document.createElement("style");
    style.id = "guild-manga-assets";
    style.innerHTML = `
      .ink-box-alt {
        border: 4px solid #000;
        border-radius: 2px 255px 3px 255px / 255px 5px 225px 3px;
      }
      .halftone-light {
        background-image: radial-gradient(rgba(255,255,255,0.4) 1.5px, transparent 1.5px);
        background-size: 8px 8px;
      }
      .halftone-dark {
        background-image: radial-gradient(rgba(0,0,0,0.6) 1.5px, transparent 1.5px);
        background-size: 6px 6px;
      }
      .speed-lines-vertical {
        background-image: repeating-linear-gradient(90deg, transparent 0px, transparent 15px, rgba(0,0,0,0.1) 15px, rgba(0,0,0,0.1) 17px);
      }
      .vs-jagged {
        clip-path: polygon(10% 0, 100% 15%, 90% 100%, 0 85%);
      }
    `;
    document.head.appendChild(style);
  }, []);
}

const F_DISPLAY = "'Anton', sans-serif";
const F_SFX = "'Bangers', cursive";
const F_MONO = "'Space Mono', monospace";

interface TopOperative {
  displayName: string;
  questPoints: number;
}

interface LeaderboardItem {
  rank: number;
  id: string;
  displayName: string;
  questPoints: number;
  faction: string;
  isCurrentPlayer: boolean;
}

interface GuildStats {
  blueMembers: number;
  redMembers: number;
  blueScore: number;
  redScore: number;
  leadingGuild: string;
  isBlueLocked: boolean;
  isRedLocked: boolean;
  topBlueOperatives: TopOperative[];
  topRedOperatives: TopOperative[];
}

export default function GuildInvites() {
  useGuildMangaAssets();

  const [stats, setStats] = useState<GuildStats>({
    blueMembers: 0,
    redMembers: 0,
    blueScore: 0,
    redScore: 0,
    leadingGuild: "Calculating...",
    isBlueLocked: false,
    isRedLocked: false,
    topBlueOperatives: [],
    topRedOperatives: [],
  });

  const [sponsors, setSponsors] = useState<SponsorData[]>(FALLBACK_SPONSORS);
  const [userFaction, setUserFaction] = useState<string>("None");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<"defect" | "abandon" | "leaderboard" | null>(null);
  const [leaderboardTab, setLeaderboardTab] = useState<"all" | "blue" | "red">("all");
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [myRank, setMyRank] = useState<LeaderboardItem | null>(null);
  const [isUserInView, setIsUserInView] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const userRowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadData() {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5101/api';
      try {
        const [statsRes, sponsorsRes] = await Promise.all([
          fetch(`${apiBase}/guild/stats`),
          fetch(`${apiBase}/landing/sponsors`)
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }

        if (sponsorsRes.ok) {
          const sponsorData = await sponsorsRes.json();
          if (sponsorData?.length > 0) setSponsors(sponsorData);
        }

        const profile = await apiService.getMyProfile();
        if (profile?.faction) {
          setUserFaction(profile.faction);
        }
      } catch (err) {
        console.error("Failed to load guild war data", err);
      }
    }
    loadData();
  }, []);

  const openLeaderboard = async () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5101/api';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${apiBase}/guild/leaderboard`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard);
        setMyRank(data.myRank);
        setActiveModal("leaderboard");
      }
    } catch (err) {
      console.error("Failed to load leaderboard data", err);
    }
  };

  useEffect(() => {
    if (activeModal !== "leaderboard" || !userRowRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsUserInView(entry.isIntersecting),
      { threshold: 0.5 }
    );

    observer.observe(userRowRef.current);
    return () => observer.disconnect();
  }, [activeModal, leaderboard, leaderboardTab]);

  const handleAction = async (actionFaction: 'Blue' | 'Red' | 'None') => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5101/api';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setStatusMessage("Sign in required!");
        return;
      }

      const res = await fetch(`${apiBase}/guild/pledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ faction: actionFaction })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage(data.message);
        setActiveModal(null);
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setStatusMessage(data.message || "Action rejected.");
      }
    } catch {
      setStatusMessage("Network error transmitting directive.");
    }
  };

  const isUserBlue = userFaction.toLowerCase() === 'blue';
  const isUserRed = userFaction.toLowerCase() === 'red';
  const isAligned = isUserBlue || isUserRed;
  const opposingFaction: 'Blue' | 'Red' = isUserBlue ? 'Red' : 'Blue';

  const filteredLeaderboard = leaderboard.filter((item) => {
    if (leaderboardTab === "blue") return item.faction.toLowerCase() === "blue";
    if (leaderboardTab === "red") return item.faction.toLowerCase() === "red";
    return true;
  });

  return (
    <section className="px-4 md:px-6 max-w-[100rem] mx-auto w-full py-16 relative">
      <div className="ink-box-alt bg-[#e8e4d8] shadow-[15px_15px_0px_#000] p-6 md:p-10 relative overflow-hidden">
        
        <div className="absolute inset-0 opacity-20 pointer-events-none halftone-dark" />
        <div className="absolute inset-0 opacity-40 pointer-events-none speed-lines-vertical mix-blend-multiply" />

        {/* TOP-LEFT OPERATIVE ACTION MENU */}
        {isAligned && (
          <div className="absolute top-4 left-4 md:top-6 md:left-6 z-40">
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="ink-box-alt bg-black text-white hover:bg-[var(--guild-primary)] hover:text-black p-2.5 md:px-4 md:py-2 uppercase text-xs tracking-wider flex items-center gap-2 shadow-[4px_4px_0px_#000] transition-all font-bold"
                style={{ fontFamily: F_MONO }}
                aria-label="Faction Orders"
              >
                <span className="text-base md:text-xs">⚡</span>
                <span className="hidden md:inline">FACTION ORDERS</span>
                <span className="hidden md:inline text-[10px]">{isMenuOpen ? "▲" : "▼"}</span>
              </button>

              {isMenuOpen && (
                <div className="absolute left-0 mt-2 w-56 ink-box-alt bg-white p-2 shadow-[6px_6px_0px_#000] flex flex-col gap-1 z-50">
                  <button
                    onClick={() => { setIsMenuOpen(false); setActiveModal("defect"); }}
                    className="w-full text-left px-3 py-2 text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors border-b border-zinc-200"
                    style={{ fontFamily: F_MONO }}
                  >
                    🗡️ Defect to {opposingFaction} (-200 QP)
                  </button>
                  <button
                    onClick={() => { setIsMenuOpen(false); setActiveModal("abandon"); }}
                    className="w-full text-left px-3 py-2 text-xs font-bold uppercase text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                    style={{ fontFamily: F_MONO }}
                  >
                    🏳️ Abandon Guild
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TOP-RIGHT FULL LEADERBOARD BUTTON */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-40">
          <button
            onClick={openLeaderboard}
            className="ink-box-alt bg-white text-black hover:bg-black hover:text-white p-2.5 md:px-4 md:py-2 uppercase text-xs tracking-wider flex items-center gap-2 shadow-[4px_4px_0px_#000] transition-all font-bold"
            style={{ fontFamily: F_MONO }}
          >
            <span>🏆</span>
            <span className="hidden md:inline">GLOBAL RANKINGS</span>
          </button>
        </div>

        {/* Section Header */}
        <div className="relative z-10 flex flex-col items-center text-center mb-6 mt-8 md:mt-0">
          <span className="bg-black text-white font-bold uppercase text-xs px-4 py-1 ink-box-alt rotate-[-2deg] mb-3 animate-pulse" style={{ fontFamily: F_MONO }}>
            👑 REALM STATUS: {stats.leadingGuild.toUpperCase()} DOMINATING
          </span>
          <h2 className="uppercase text-5xl md:text-7xl text-black tracking-tighter" style={{ fontFamily: F_DISPLAY }}>
            {isAligned ? "Faction Standings" : "Join the Guild War"}
          </h2>

          {statusMessage && (
            <div className="mt-4 bg-black text-white font-bold text-xs uppercase px-4 py-2 ink-box-alt" style={{ fontFamily: F_MONO }}>
              {statusMessage}
            </div>
          )}
        </div>

        {/* --- GUILD PANELS --- */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-4 items-center">
          
          <div className="hidden lg:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 vs-jagged bg-white border-4 border-black w-32 h-32 items-center justify-center shadow-[6px_6px_0px_#000] rotate-6">
            <span className="text-black text-6xl rotate-[-6deg]" style={{ fontFamily: F_SFX }}>VS</span>
          </div>

          {/* BLUE GUILD PANEL */}
          <div className="relative group perspective-1000">
            <div className={`ink-box-alt bg-[#1a4a9c] p-6 md:p-8 min-h-[360px] flex flex-col justify-between relative overflow-hidden shadow-[8px_8px_0px_#000] lg:skew-x-[-3deg] lg:-rotate-1 transition-transform group-hover:-translate-y-2 group-hover:shadow-[12px_12px_0px_#000] ${isUserBlue ? 'border-4 border-cyan-300' : ''}`}>
              
              <img src={blue} alt="Blue Guild Art" className="absolute inset-0 w-full h-full object-contain object-center p-4 opacity-40 mix-blend-hard-light group-hover:scale-110 transition-transform duration-[10s]" />
              <div className="absolute inset-0 halftone-light opacity-30 mix-blend-overlay pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d2859] via-transparent to-transparent opacity-90" />

              <div className="relative z-10 lg:skew-x-[3deg]">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="uppercase text-5xl md:text-6xl text-white drop-shadow-[3px_3px_0px_#000]" style={{ fontFamily: F_DISPLAY }}>
                      Azure <br/> <span className="text-[#6bb5ff]">Syndicate</span>
                    </h3>
                    {isUserBlue && (
                      <span className="inline-block bg-cyan-400 text-black text-[10px] font-black uppercase px-2 py-0.5 ink-box-alt mt-1 tracking-wider" style={{ fontFamily: F_MONO }}>
                        ✓ YOUR GUILD
                      </span>
                    )}
                  </div>
                  <div className="bg-white text-black font-black text-3xl px-3 py-1 ink-box-alt rotate-6 shadow-[3px_3px_0px_#000]" style={{ fontFamily: F_SFX }}>
                    青
                  </div>
                </div>
                
                <p className="text-white/90 text-sm font-bold bg-black/60 p-3 ink-box-alt border-white mb-4" style={{ fontFamily: F_MONO }}>
                  Tactical & elite. <span className="text-cyan-300">{stats.blueMembers} operatives</span> | Score: {stats.blueScore} QP
                </p>

                {/* Top 3 Operatives */}
                <div className="bg-black/80 p-3 ink-box-alt border-white/40">
                  <span className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold block mb-1.5" style={{ fontFamily: F_MONO }}>Top Vanguard Elites:</span>
                  <div className="flex flex-col gap-1.5">
                    {stats.topBlueOperatives && stats.topBlueOperatives.length > 0 ? (
                      stats.topBlueOperatives.map((op, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-white font-bold" style={{ fontFamily: F_MONO }}>
                          <span>#{idx + 1} @{op.displayName}</span>
                          <span className="text-cyan-400">{op.questPoints} QP</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[11px] text-zinc-400 italic" style={{ fontFamily: F_MONO }}>No operatives active yet.</span>
                    )}
                  </div>
                </div>
              </div>

              {!isAligned && (
                <div className="relative z-10 mt-6 lg:skew-x-[3deg]">
                  <button 
                    onClick={() => handleAction('Blue')}
                    disabled={stats.isBlueLocked}
                    className={`w-full text-xl uppercase py-4 ink-box-alt transition-all shadow-[6px_6px_0px_#000] active:translate-y-2 active:shadow-none ${
                      stats.isBlueLocked 
                        ? 'bg-zinc-700 text-zinc-300 grayscale cursor-not-allowed border-2 border-dashed border-red-500' 
                        : 'bg-white text-black hover:bg-black hover:text-white hover:border-white'
                    }`}
                    style={{ fontFamily: F_DISPLAY }}
                  >
                    {stats.isBlueLocked ? "RECRUITMENT FROZEN" : "Pledge to Blue"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RED GUILD PANEL */}
          <div className="relative group perspective-1000">
            <div className={`ink-box-alt bg-[#b01e33] p-6 md:p-8 min-h-[360px] flex flex-col justify-between relative overflow-hidden shadow-[8px_8px_0px_#000] lg:skew-x-[3deg] lg:rotate-1 transition-transform group-hover:-translate-y-2 group-hover:shadow-[12px_12px_0px_#000] ${isUserRed ? 'border-4 border-red-300' : ''}`}>
              
              <img src={red} alt="Red Guild Art" className="absolute inset-0 w-full h-full object-contain object-center p-4 opacity-50 mix-blend-color-burn group-hover:scale-110 transition-transform duration-[10s]" />
              <div className="absolute inset-0 halftone-light opacity-30 mix-blend-overlay pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#590d18] via-transparent to-transparent opacity-90" />

              <div className="relative z-10 lg:skew-x-[-3deg]">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="uppercase text-5xl md:text-6xl text-white drop-shadow-[3px_3px_0px_#000]" style={{ fontFamily: F_DISPLAY }}>
                      Crimson <br/> <span className="text-[#ff788c]">Vanguard</span>
                    </h3>
                    {isUserRed && (
                      <span className="inline-block bg-red-400 text-black text-[10px] font-black uppercase px-2 py-0.5 ink-box-alt mt-1 tracking-wider" style={{ fontFamily: F_MONO }}>
                        ✓ YOUR GUILD
                      </span>
                    )}
                  </div>
                  <div className="bg-black text-white font-black text-3xl px-3 py-1 ink-box-alt rotate-[-6deg] shadow-[3px_3px_0px_#fff]" style={{ fontFamily: F_SFX }}>
                    赤
                  </div>
                </div>
                
                <p className="text-white/90 text-sm font-bold bg-black/60 p-3 ink-box-alt border-white mb-4" style={{ fontFamily: F_MONO }}>
                  Aggressive & fierce. <span className="text-red-300">{stats.redMembers} operatives</span> | Score: {stats.redScore} QP
                </p>

                {/* Top 3 Operatives */}
                <div className="bg-black/80 p-3 ink-box-alt border-white/40">
                  <span className="text-[10px] uppercase tracking-widest text-red-300 font-bold block mb-1.5" style={{ fontFamily: F_MONO }}>Top Vanguard Elites:</span>
                  <div className="flex flex-col gap-1.5">
                    {stats.topRedOperatives && stats.topRedOperatives.length > 0 ? (
                      stats.topRedOperatives.map((op, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-white font-bold" style={{ fontFamily: F_MONO }}>
                          <span>#{idx + 1} @{op.displayName}</span>
                          <span className="text-red-400">{op.questPoints} QP</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[11px] text-zinc-400 italic" style={{ fontFamily: F_MONO }}>No operatives active yet.</span>
                    )}
                  </div>
                </div>
              </div>

              {!isAligned && (
                <div className="relative z-10 mt-6 lg:skew-x-[-3deg]">
                  <button 
                    onClick={() => handleAction('Red')}
                    disabled={stats.isRedLocked}
                    className={`w-full text-xl uppercase py-4 ink-box-alt transition-all shadow-[6px_6px_0px_#000] active:translate-y-2 active:shadow-none ${
                      stats.isRedLocked 
                        ? 'bg-zinc-700 text-zinc-300 grayscale cursor-not-allowed border-2 border-dashed border-red-500' 
                        : 'bg-black text-white hover:bg-white hover:text-black hover:border-black'
                    }`}
                    style={{ fontFamily: F_DISPLAY }}
                  >
                    {stats.isRedLocked ? "RECRUITMENT FROZEN" : "Pledge to Red"}
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* --- GUILD COMMS (WhatsApp Hub Banner - Only for Aligned Members) --- */}
        {isAligned && (
          <div className="relative z-10 mt-12 mb-4 flex flex-col md:flex-row items-center justify-between gap-4 p-5 ink-box-alt bg-black text-white shadow-[6px_6px_0px_#000]">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 ink-box-alt flex items-center justify-center shrink-0 text-black"
                style={{ backgroundColor: isUserBlue ? "#6bb5ff" : "#FF2E4D" }}
              >
                <WhatsAppIcon className="w-6 h-6 text-black" />
              </div>
              <div>
                <span className="text-lg uppercase leading-none block text-white" style={{ fontFamily: F_DISPLAY }}>
                  {isUserBlue ? "Azure Syndicate Comms" : "Crimson Vanguard Comms"}
                </span>
                <span className="text-[11px] text-zinc-400 uppercase font-bold" style={{ fontFamily: F_MONO }}>
                  Exclusive operative channels & battle planning
                </span>
              </div>
            </div>

            <a
              href={isUserBlue ? AZURE_WHATSAPP : CRIMSON_WHATSAPP}
              target="_blank"
              rel="noreferrer"
              className="w-full md:w-auto px-6 py-2.5 ink-box-alt hover:bg-white transition-all text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[4px_4px_0px_rgba(255,255,255,0.2)]"
              style={{ 
                backgroundColor: isUserBlue ? "#6bb5ff" : "#FF2E4D", 
                color: isUserBlue ? "#000" : "#fff",
                fontFamily: F_MONO 
              }}
            >
              <WhatsAppIcon className={`w-4 h-4 ${isUserBlue ? 'text-black' : 'text-white'}`} />
              Join {isUserBlue ? 'Azure' : 'Crimson'} Hub
            </a>
          </div>
        )}

        {/* --- SPONSORS SECTION (Allied Factions) --- */}
        <div className="relative z-10 mt-14 pt-8 border-t-4 border-black border-dashed flex flex-col items-center">
          
          <div className="mb-6">
            <h3 className="uppercase text-2xl md:text-3xl text-black text-center" style={{ fontFamily: F_DISPLAY }}>
              Allied Factions <span className="text-sm tracking-widest text-black/60 ml-2" style={{ fontFamily: F_MONO }}>// SPONSORS</span>
            </h3>
          </div>

          <div className="flex flex-wrap justify-center gap-4 md:gap-6 items-center w-full">
            {sponsors.map((sponsor) => (
              <a 
                key={sponsor.id} 
                href={sponsor.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="ink-box-alt bg-white px-6 py-4 flex flex-col items-center justify-center min-w-[180px] shadow-[4px_4px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] transition-all cursor-pointer group"
                style={{
                  borderColor: isUserBlue ? '#1a4a9c' : isUserRed ? '#b01e33' : '#000'
                }}
              >
                <span 
                  className="uppercase text-xl text-black leading-none mb-1 group-hover:text-[var(--guild-primary)] transition-colors" 
                  style={{ fontFamily: F_DISPLAY }}
                >
                  {sponsor.name}
                </span>
                <span className="text-[10px] text-black/60 uppercase font-bold tracking-widest" style={{ fontFamily: F_MONO }}>
                  {sponsor.role}
                </span>
              </a>
            ))}
          </div>

        </div>

      </div>

      {/* --- CONFIRMATION MODALS --- */}
      {(activeModal === "defect" || activeModal === "abandon") && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="ink-box-alt bg-white p-6 max-w-md w-full shadow-[12px_12px_0px_#000] relative">
            <h3 className="uppercase text-3xl text-black mb-2" style={{ fontFamily: F_DISPLAY }}>
              {activeModal === "defect" ? `Defect to ${opposingFaction}?` : "Abandon Allegiance?"}
            </h3>
            
            <p className="text-sm font-bold text-black/80 mb-6" style={{ fontFamily: F_MONO }}>
              {activeModal === "defect" 
                ? `Defecting will deduct 200 Quest Points from your balance as a betrayal tax. Proceed?` 
                : `Abandoning your guild resets your faction status to neutral. Confirm departure?`}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => handleAction(activeModal === "defect" ? opposingFaction : "None")}
                className="flex-1 bg-red-600 text-white font-bold py-3 uppercase text-sm ink-box-alt hover:bg-black transition-colors"
                style={{ fontFamily: F_DISPLAY }}
              >
                Confirm
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 bg-zinc-200 text-black font-bold py-3 uppercase text-sm ink-box-alt hover:bg-zinc-300 transition-colors"
                style={{ fontFamily: F_DISPLAY }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FULL-SCREEN LEADERBOARD MODAL --- */}
      {activeModal === "leaderboard" && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8">
          <div className="ink-box-alt bg-[#e8e4d8] w-full max-w-4xl h-[85vh] shadow-[15px_15px_0px_#000] flex flex-col relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 bg-black text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-black">
              <div>
                <span className="text-[10px] uppercase font-bold text-yellow-400 tracking-widest block" style={{ fontFamily: F_MONO }}>
                  REALM TELEMETRY // FULL STANDINGS
                </span>
                <h3 className="text-3xl md:text-4xl uppercase leading-none" style={{ fontFamily: F_DISPLAY }}>
                  Global Leaderboard
                </h3>
              </div>

              {/* Leaderboard Guild Filter Tabs */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLeaderboardTab("all")}
                  className={`px-3 py-1.5 text-xs font-bold uppercase ink-box-alt transition-colors ${
                    leaderboardTab === "all" ? "bg-yellow-400 text-black" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                  style={{ fontFamily: F_MONO }}
                >
                  All Realms
                </button>
                <button
                  onClick={() => setLeaderboardTab("blue")}
                  className={`px-3 py-1.5 text-xs font-bold uppercase ink-box-alt transition-colors ${
                    leaderboardTab === "blue" ? "bg-[#6bb5ff] text-black" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                  style={{ fontFamily: F_MONO }}
                >
                  Azure Syndicate
                </button>
                <button
                  onClick={() => setLeaderboardTab("red")}
                  className={`px-3 py-1.5 text-xs font-bold uppercase ink-box-alt transition-colors ${
                    leaderboardTab === "red" ? "bg-[#FF2E4D] text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                  style={{ fontFamily: F_MONO }}
                >
                  Crimson Vanguard
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="ink-box-alt bg-white text-black hover:bg-red-600 hover:text-white px-3 py-1.5 font-black uppercase text-xs ml-2"
                  style={{ fontFamily: F_DISPLAY }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable Leaderboard List */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-2 pb-24">
              {filteredLeaderboard.length > 0 ? (
                filteredLeaderboard.map((item, index) => {
                  const displayRank = leaderboardTab === "all" ? item.rank : index + 1;
                  return (
                    <div
                      key={item.id}
                      ref={item.isCurrentPlayer ? userRowRef : null}
                      className={`ink-box-alt p-3 md:p-4 flex items-center justify-between transition-all ${
                        item.isCurrentPlayer 
                          ? 'bg-yellow-200 border-2 border-black font-black scale-[1.01]' 
                          : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span 
                          className={`text-xl md:text-2xl font-black w-8 text-center ${
                            displayRank === 1 ? 'text-yellow-600' : displayRank === 2 ? 'text-zinc-500' : displayRank === 3 ? 'text-amber-700' : 'text-black'
                          }`}
                          style={{ fontFamily: F_DISPLAY }}
                        >
                          #{displayRank}
                        </span>
                        <div>
                          <span className="text-sm md:text-base text-black font-bold block leading-none" style={{ fontFamily: F_MONO }}>
                            @{item.displayName} {item.isCurrentPlayer && "(YOU)"}
                          </span>
                          <span 
                            className={`text-[9px] uppercase font-bold tracking-widest ${
                              item.faction.toLowerCase() === 'blue' ? 'text-blue-600' : item.faction.toLowerCase() === 'red' ? 'text-red-600' : 'text-zinc-500'
                            }`}
                            style={{ fontFamily: F_MONO }}
                          >
                            {item.faction.toLowerCase() === 'blue' ? 'Azure Syndicate' : item.faction.toLowerCase() === 'red' ? 'Crimson Vanguard' : 'Unaligned'}
                          </span>
                        </div>
                      </div>

                      <span className="text-sm md:text-base font-black text-black" style={{ fontFamily: F_MONO }}>
                        {item.questPoints} QP
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-zinc-500 font-bold uppercase" style={{ fontFamily: F_MONO }}>
                  No operatives recorded in this division yet.
                </div>
              )}
            </div>

            {/* Sticky Current User Rank Bar */}
            {myRank && !isUserInView && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-black text-white border-t-4 border-black flex justify-between items-center shadow-[0_-8px_20px_rgba(0,0,0,0.5)] z-20">
                <div className="flex items-center gap-3">
                  <span className="bg-yellow-400 text-black px-2 py-1 text-xs font-black ink-box-alt" style={{ fontFamily: F_DISPLAY }}>
                    YOUR RANK: #{myRank.rank}
                  </span>
                  <span className="text-xs font-bold text-zinc-300" style={{ fontFamily: F_MONO }}>
                    @{myRank.displayName}
                  </span>
                </div>
                <span className="text-xs font-black text-yellow-400" style={{ fontFamily: F_MONO }}>
                  {myRank.questPoints} QP
                </span>
              </div>
            )}

          </div>
        </div>
      )}
    </section>
  );
}