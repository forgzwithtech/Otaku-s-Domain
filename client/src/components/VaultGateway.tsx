import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { apiService } from "../services/api";
import { fetchVaultMedia, type VaultMedia } from "../services/anilist";

function useVaultMangaAssets() {
  useEffect(() => {
    if (document.getElementById("vault-manga-assets")) return;
    const style = document.createElement("style");
    style.id = "vault-manga-assets";
    style.innerHTML = `
      .ink-box-vault {
        border: 4px solid #000;
        border-radius: 2px 255px 3px 255px / 255px 5px 225px 3px;
      }
      .halftone-bg {
        background-image: radial-gradient(rgba(0,0,0,0.4) 1.5px, transparent 1.5px);
        background-size: 6px 6px;
      }
      .hazard-tape {
        background: repeating-linear-gradient(
          -45deg,
          #000,
          #000 15px,
          #dc2626 15px,
          #dc2626 30px
        );
      }
      .manga-scrollbar::-webkit-scrollbar {
        height: 10px;
      }
      .manga-scrollbar::-webkit-scrollbar-track {
        background: #e8e4d8;
        border: 2px solid #000;
      }
      .manga-scrollbar::-webkit-scrollbar-thumb {
        background-color: #000;
      }
      .glitch-text {
        position: relative;
      }
      .glitch-text::before, .glitch-text::after {
        content: attr(data-text);
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0.8;
      }
      .glitch-text::before {
        left: 2px;
        text-shadow: -2px 0 red;
        clip: rect(24px, 550px, 90px, 0);
        animation: glitch-anim 3s infinite linear alternate-reverse;
      }
      .glitch-text::after {
        left: -2px;
        text-shadow: -2px 0 blue;
        clip: rect(85px, 550px, 140px, 0);
        animation: glitch-anim 2.5s infinite linear alternate-reverse;
      }
      @keyframes glitch-anim {
        0% { clip: rect(10px, 9999px, 44px, 0); }
        50% { clip: rect(20px, 9999px, 90px, 0); }
        100% { clip: rect(12px, 9999px, 88px, 0); }
      }
    `;
    document.head.appendChild(style);
  }, []);
}

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

export default function VaultGateway() {
  useVaultMangaAssets();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"ANIME" | "MANGA">("ANIME");
  const [items, setItems] = useState<VaultMedia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [hasDobRecorded, setHasDobRecorded] = useState<boolean>(false);
  const [isAgeVerified, setIsAgeVerified] = useState<boolean>(false);
  const [showAgeModal, setShowAgeModal] = useState<boolean>(false);
  const [dob, setDob] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadTrendingMedia() {
      setLoading(true);
      try {
        const res = await fetchVaultMedia({
          page: 1,
          perPage: 10,
          type: activeTab,
          isAdult: false,
          sort: ["TRENDING_DESC", "POPULARITY_DESC"]
        });
        setItems(res.media);
      } catch (err) {
        console.error("AniList sync failed:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTrendingMedia();
  }, [activeTab]);

  useEffect(() => {
    async function checkUserVerification() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsLoggedIn(true);
          const profile = await apiService.getMyProfile();
          if (profile) {
            if (profile.dateOfBirth) setHasDobRecorded(true);
            if (profile.isAgeVerified18Plus) setIsAgeVerified(true);
          }
        }
      } catch {
        // Guest user
      }
    }
    checkUserVerification();
  }, []);

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://otaku-s-domain.onrender.com/api';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setStatusMessage("Please sign in to record your date of birth.");
        return;
      }

      const res = await fetch(`${apiBase}/auth/verify-age`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ dateOfBirth: dob })
      });

      const data = await res.json();
      if (res.ok) {
        setHasDobRecorded(true);
        setIsAgeVerified(data.isAllowed);
        setStatusMessage(data.message);
        setShowAgeModal(false);

        if (data.isAllowed) {
          setTimeout(() => navigate("/red-light-district"), 1000);
        }
      } else {
        setStatusMessage(data.message || "Failed to record credentials.");
      }
    } catch {
      setStatusMessage("Network error validating clearance.");
    }
  };

  const handleEnterDistrict = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("Sign in required to access restricted vault archives.");
      return;
    }

    if (isAgeVerified) {
      navigate("/red-light-district");
    } else {
      setShowAgeModal(true);
    }
  };

  const isMinor = isLoggedIn && hasDobRecorded && !isAgeVerified;

  return (
    <section className="px-4 md:px-6 max-w-[100rem] mx-auto w-full py-16 relative z-10">
      <div className="ink-box-vault bg-[#e8e4d8] shadow-[15px_15px_0px_#000] p-6 md:p-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none halftone-bg" />

        {/* Top Clearance Prompt */}
        {!hasDobRecorded && (
          <div className="relative z-10 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-black text-white ink-box-vault">
            <div className="flex items-center gap-2.5">
              <span className="text-yellow-400 text-sm">🛡️</span>
              <span className="text-xs uppercase font-bold tracking-wider" style={{ fontFamily: F_MONO }}>
                SECURITY PROTOCOL: RECORD YOUR DOB FOR FULL VAULT CLEARANCE
              </span>
            </div>

            <button
              onClick={() => setShowAgeModal(true)}
              className="bg-yellow-400 text-black px-3 py-1 text-xs font-black uppercase ink-box-vault hover:bg-white transition-colors self-start sm:self-auto"
              style={{ fontFamily: F_DISPLAY }}
            >
              Verify Clearance ↗
            </button>
          </div>
        )}

        {/* Header & Toggle Switches & Full Vault Entry Button */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <span className="bg-white text-black font-bold uppercase text-xs px-4 py-1 ink-box-vault border-2 border-black rotate-[-2deg] mb-2 shadow-[3px_3px_0px_#000] inline-block" style={{ fontFamily: F_MONO }}>
              Live AniList Data Feed
            </span>
            <h2 className="uppercase text-4xl md:text-6xl text-black tracking-tighter" style={{ fontFamily: F_DISPLAY }}>
              Trending in the <span className="text-white" style={{ WebkitTextStroke: "2px black", textShadow: "4px 4px 0px #000" }}>Vault</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setActiveTab("ANIME")}
              className={`px-4 py-2 uppercase font-black text-xs md:text-sm ink-box-vault transition-all ${
                activeTab === "ANIME"
                  ? "bg-black text-white shadow-[4px_4px_0px_#000]"
                  : "bg-white text-black hover:bg-zinc-200"
              }`}
              style={{ fontFamily: F_DISPLAY }}
            >
              📺 Trending Anime
            </button>
            <button
              onClick={() => setActiveTab("MANGA")}
              className={`px-4 py-2 uppercase font-black text-xs md:text-sm ink-box-vault transition-all ${
                activeTab === "MANGA"
                  ? "bg-black text-white shadow-[4px_4px_0px_#000]"
                  : "bg-white text-black hover:bg-zinc-200"
              }`}
              style={{ fontFamily: F_DISPLAY }}
            >
              📖 Trending Manga
            </button>
            <Link
              to="/vault"
              className="px-4 py-2 uppercase font-black text-xs md:text-sm bg-yellow-400 text-black ink-box-vault hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_#000]"
              style={{ fontFamily: F_DISPLAY }}
            >
              Enter Full Vault ↗
            </Link>
          </div>
        </div>

        {statusMessage && (
          <div className="relative z-10 mb-6 bg-black text-white font-bold text-xs uppercase px-4 py-2 ink-box-vault" style={{ fontFamily: F_MONO }}>
            {statusMessage}
          </div>
        )}

        {/* Media Slider (Each item links to /vault/:id) */}
        <div className="relative z-10 flex gap-6 overflow-x-auto pb-8 mb-6 manga-scrollbar snap-x snap-mandatory min-h-[360px] items-center">
          {loading ? (
            <div className="w-full py-16 text-center font-bold uppercase text-zinc-500 tracking-widest" style={{ fontFamily: F_MONO }}>
              ⚡ Querying AniList Live Matrix...
            </div>
          ) : (
            items.map((item) => (
              <Link 
                key={item.id} 
                to={`/vault/${item.id}`}
                className="ink-box-vault bg-white p-4 w-[240px] md:w-[280px] shrink-0 snap-center shadow-[6px_6px_0px_#000] flex flex-col justify-between group hover:-translate-y-2 hover:shadow-[10px_10px_0px_#000] transition-all duration-300 cursor-pointer"
              >
                <div>
                  <div className="aspect-[2/3] w-full ink-box-vault border-2 overflow-hidden relative mb-4 bg-zinc-900">
                    <div className="absolute top-2 -left-1 bg-[var(--guild-primary)] text-black text-[10px] font-black uppercase px-3 py-1 border-2 border-black z-10 shadow-[2px_2px_0px_#000]" style={{ fontFamily: F_MONO }}>
                      {item.status}
                    </div>

                    {item.score && (
                      <div className="absolute top-2 right-2 bg-black/80 text-yellow-400 text-[10px] font-bold px-2 py-0.5 ink-box-vault z-10" style={{ fontFamily: F_MONO }}>
                        ★ {item.score}%
                      </div>
                    )}
                    
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                    />

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-white text-black text-xs font-black uppercase px-3 py-1.5 ink-box-vault shadow-[3px_3px_0px_#000]" style={{ fontFamily: F_DISPLAY }}>
                        View Archives ↗
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1" style={{ fontFamily: F_MONO }}>
                      {item.type}
                    </p>
                    <h3 className="uppercase text-lg text-black leading-tight line-clamp-2 group-hover:text-[var(--guild-primary)] transition-colors" style={{ fontFamily: F_DISPLAY }}>
                      {item.title}
                    </h3>
                  </div>
                </div>

                {/* High-Contrast Manga Genre Badges */}
                <div className="mt-4 pt-2 border-t-2 border-black/10 flex flex-wrap gap-1.5">
                  {item.genres && item.genres.length > 0 ? (
                    item.genres.slice(0, 2).map((g, idx) => (
                      <span 
                        key={idx} 
                        className="text-[10px] uppercase font-black bg-black text-white px-2 py-0.5 ink-box-vault tracking-wider" 
                        style={{ fontFamily: F_MONO }}
                      >
                        {g}
                      </span>
                    ))
                  ) : (
                    <span 
                      className="text-[10px] uppercase font-black bg-zinc-200 text-zinc-800 px-2 py-0.5 border border-black/20 tracking-wider"
                      style={{ fontFamily: F_MONO }}
                    >
                      General
                    </span>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Red Light District Section */}
        {!isMinor && (
          <div className="relative z-10 ink-box-vault border-4 border-red-600 bg-[#0a0a0a] shadow-[10px_10px_0px_#dc2626] overflow-hidden group mt-6">
            <div className="absolute top-0 left-0 w-full h-3 hazard-tape" />
            <div className="absolute bottom-0 left-0 w-full h-3 hazard-tape" />
            
            <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="flex-1">
                <span className="inline-block bg-red-600 text-white font-bold text-[10px] uppercase px-3 py-1 tracking-widest mb-3 shadow-[3px_3px_0px_#000]" style={{ fontFamily: F_MONO }}>
                  ⚠ RESTRICTED ACCESS (18+)
                </span>
                
                <h3 
                  className="uppercase text-4xl md:text-5xl text-white tracking-wide glitch-text mb-3" 
                  data-text="RED LIGHT DISTRICT"
                  style={{ fontFamily: F_DISPLAY, textShadow: "3px 3px 0 red" }}
                >
                  RED LIGHT DISTRICT
                </h3>
                
                <p className="text-gray-400 text-sm md:text-base border-l-4 border-red-600 pl-4 max-w-2xl leading-relaxed" style={{ fontFamily: F_MONO }}>
                  {isAgeVerified 
                    ? "✓ Clearance Verified: Access granted to classified mature and 18+ archives." 
                    : "Uncensored manga breakdowns, mature discussion threads, and classified archives. Age verification required."}
                </p>
              </div>

              <button 
                onClick={handleEnterDistrict}
                className="shrink-0 bg-red-600 text-white uppercase text-xl md:text-2xl px-10 py-4 ink-box-vault border-white hover:bg-white hover:text-red-600 transition-all shadow-[6px_6px_0px_#000] active:translate-y-2 active:shadow-none -rotate-2"
                style={{ fontFamily: F_DISPLAY }}
              >
                {isAgeVerified ? "Enter District ↗" : "Verify & Enter"}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Age Verification Modal */}
      {showAgeModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="ink-box-vault bg-white p-6 md:p-8 max-w-md w-full shadow-[12px_12px_0px_#dc2626] border-4 border-red-600 relative">
            <span className="text-[10px] uppercase font-bold text-red-600 tracking-widest block mb-1" style={{ fontFamily: F_MONO }}>
              SECURITY CLEARANCE PROTOCOL
            </span>
            <h3 className="uppercase text-3xl text-black mb-3" style={{ fontFamily: F_DISPLAY }}>
              Record Date of Birth
            </h3>
            
            <p className="text-xs font-bold text-black/70 mb-6 leading-relaxed" style={{ fontFamily: F_MONO }}>
              Your date of birth will be permanently saved to your operative profile to determine clearance for mature archives.
            </p>

            <form onSubmit={handleVerifySubmit} className="flex flex-col gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-black/60 block mb-1" style={{ fontFamily: F_MONO }}>
                  Date of Birth
                </span>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                  className="w-full bg-zinc-100 border-2 border-black p-3 font-bold text-black focus:outline-none"
                  style={{ fontFamily: F_MONO }}
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white font-bold py-3 uppercase text-sm ink-box-vault hover:bg-black transition-colors"
                  style={{ fontFamily: F_DISPLAY }}
                >
                  Save Clearance
                </button>
                <button
                  type="button"
                  onClick={() => setShowAgeModal(false)}
                  className="flex-1 bg-zinc-200 text-black font-bold py-3 uppercase text-sm ink-box-vault hover:bg-zinc-300 transition-colors"
                  style={{ fontFamily: F_DISPLAY }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}