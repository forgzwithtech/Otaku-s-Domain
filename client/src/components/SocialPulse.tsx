import { useState, useEffect } from "react";

/**
 * ------------------------------------------------------------------
 *  SOCIAL PULSE — Automated Transmissions & Community Portals
 * ------------------------------------------------------------------
 */

interface YouTubeVideo {
  title: string;
  link: string;
  thumbnail: string;
  date: string;
}

function useSocialMangaAssets() {
  useEffect(() => {
    if (document.getElementById("social-manga-assets")) return;
    const style = document.createElement("style");
    style.id = "social-manga-assets";
    style.innerHTML = `
      .ink-box-social {
        border: 4px solid #000;
        border-radius: 2px 255px 3px 255px / 255px 5px 225px 3px;
      }
      .halftone-dark {
        background-image: radial-gradient(rgba(0,0,0,0.7) 1.5px, transparent 1.5px);
        background-size: 6px 6px;
      }
      .halftone-light {
        background-image: radial-gradient(rgba(255,255,255,0.4) 1.5px, transparent 1.5px);
        background-size: 8px 8px;
      }
      @keyframes marquee-scroll {
        0% { transform: translateX(0%); }
        100% { transform: translateX(-50%); }
      }
      .animate-marquee-custom {
        display: inline-flex;
        white-space: nowrap;
        animation: marquee-scroll 25s linear infinite;
      }
      .animate-marquee-custom:hover {
        animation-play-state: paused;
      }
    `;
    document.head.appendChild(style);
  }, []);
}

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";
const F_SFX = "'Bangers', cursive";

const SOCIAL_LINKS = {
  youtube: "https://www.youtube.com/@Otakus_Domain",
  tiktok: "https://www.tiktok.com/@otakus_domain5",
  twitter: "https://x.com/otakus__domain",
  instagram: "https://instagram.com/otakus__domain",
};

export default function SocialPulse() {
  useSocialMangaAssets();

  const [latestVideo, setLatestVideo] = useState<YouTubeVideo>({
    title: "Watch Party Highlights & Faction Battles",
    link: SOCIAL_LINKS.youtube,
    thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1000&auto=format&fit=crop",
    date: "Latest Transmission",
  });

  // Automated free fetch for YouTube only
  useEffect(() => {
    async function loadLatestVideo() {
      try {
        const res = await fetch(
          `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(
            "https://www.youtube.com/feeds/videos.xml?channel_id=UCaXV2R2tEDUkWXRf4pHJVtg"
          )}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.status === "ok" && data.items?.length > 0) {
            const vid = data.items[0];
            setLatestVideo({
              title: vid.title,
              link: vid.link,
              thumbnail: vid.thumbnail || latestVideo.thumbnail,
              date: new Date(vid.pubDate).toLocaleDateString(),
            });
          }
        }
      } catch {
        // Keeps clean fallback without breaking the UI
      }
    }
    loadLatestVideo();
  }, []);

  const headlines = [
    "Catch our anime video drops on YouTube (@Otakus_Domain)",
    "Join live discussions on X (@otakus__domain)",
    "Watch our fast edits & cosplay shorts on TikTok (@otakus_domain5)",
    "Check out community event photos on Instagram (@otakus__domain)",
  ];

  return (
    <section className="px-4 md:px-6 max-w-[100rem] mx-auto w-full py-16 relative">
      <div className="ink-box-social bg-[#e8e4d8] shadow-[15px_15px_0px_#000] p-6 md:p-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none halftone-dark" />

        {/* Header */}
        <div className="relative z-10 flex flex-col items-start mb-8 border-b-4 border-black pb-4 border-dashed">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 bg-red-600 rounded-full animate-ping" />
            <span className="bg-black text-white font-bold uppercase text-xs px-3 py-0.5 ink-box-social rotate-[-1deg]" style={{ fontFamily: F_MONO }}>
              Social Broadcast
            </span>
          </div>
          <h2 className="uppercase text-5xl md:text-7xl text-black tracking-tighter" style={{ fontFamily: F_DISPLAY }}>
            The <span className="text-white" style={{ WebkitTextStroke: "2px black", textShadow: "4px 4px 0px #000" }}>Pulse</span>
          </h2>
        </div>

        {/* Media Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8 relative z-10">
          
          {/* YouTube Live Panel (Automated) */}
          <div className="md:col-span-7 ink-box-social bg-black p-4 md:p-6 shadow-[8px_8px_0px_#000] flex flex-col group relative overflow-hidden">
            <div className="absolute inset-0 halftone-light opacity-10 pointer-events-none" />
            
            <div className="flex justify-between items-center mb-4 z-10">
              <span className="text-red-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2" style={{ fontFamily: F_MONO }}>
                ▶ YouTube <span className="text-white">@Otakus_Domain</span>
              </span>
              <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 font-bold uppercase">Latest Upload</span>
            </div>

            <a 
              href={latestVideo.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="relative w-full flex-1 min-h-[260px] rounded-lg border-2 border-white/20 overflow-hidden group-hover:border-red-500 transition-colors block shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]"
            >
              <img 
                src={latestVideo.thumbnail} 
                alt={latestVideo.title} 
                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-12 bg-red-600/90 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-[4px_4px_0px_#000] group-hover:bg-red-600 group-hover:scale-110 transition-transform">
                  ▶
                </div>
              </div>

              <div className="absolute bottom-4 left-4 right-4 z-10">
                <span className="text-white text-lg md:text-xl uppercase tracking-wide drop-shadow-[2px_2px_0px_#000] line-clamp-2" style={{ fontFamily: F_DISPLAY }}>
                  {latestVideo.title}
                </span>
                <span className="text-[11px] text-gray-300 font-mono mt-1 block font-bold">{latestVideo.date}</span>
              </div>
            </a>
          </div>

          {/* Social Gateway Panels */}
          <div className="md:col-span-5 flex flex-col gap-4">
            
            {/* TikTok Portal */}
            <a 
              href={SOCIAL_LINKS.tiktok}
              target="_blank" 
              rel="noopener noreferrer"
              className="ink-box-social bg-[#010101] text-white p-4 shadow-[6px_6px_0px_#000] flex items-center justify-between group hover:-translate-y-1 hover:shadow-[8px_8px_0px_#000] transition-all relative overflow-hidden"
            >
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-11 h-11 bg-cyan-400 text-black flex items-center justify-center text-xl font-black ink-box-social group-hover:rotate-6 transition-transform">
                  ♫
                </div>
                <div>
                  <span className="text-lg uppercase leading-none block text-white" style={{ fontFamily: F_DISPLAY }}>
                    TikTok Channel
                  </span>
                  <span className="text-[11px] text-cyan-400 font-bold" style={{ fontFamily: F_MONO }}>
                    @otakus_domain5
                  </span>
                </div>
              </div>
              <span className="text-xs uppercase font-bold bg-white/10 px-3 py-1 ink-box-social group-hover:bg-cyan-400 group-hover:text-black transition-colors" style={{ fontFamily: F_MONO }}>
                Watch ↗
              </span>
            </a>

            {/* Instagram Portal */}
            <a 
              href={SOCIAL_LINKS.instagram}
              target="_blank" 
              rel="noopener noreferrer"
              className="ink-box-social bg-gradient-to-r from-purple-950 via-pink-950 to-orange-950 text-white p-4 shadow-[6px_6px_0px_#000] flex items-center justify-between group hover:-translate-y-1 hover:shadow-[8px_8px_0px_#000] transition-all relative overflow-hidden"
            >
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-11 h-11 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white flex items-center justify-center text-xl font-black ink-box-social group-hover:rotate-6 transition-transform">
                  📷
                </div>
                <div>
                  <span className="text-lg uppercase leading-none block text-white" style={{ fontFamily: F_DISPLAY }}>
                    Instagram Gallery
                  </span>
                  <span className="text-[11px] text-pink-400 font-bold" style={{ fontFamily: F_MONO }}>
                    @otakus__domain
                  </span>
                </div>
              </div>
              <span className="text-xs uppercase font-bold bg-white/10 px-3 py-1 ink-box-social group-hover:bg-pink-500 group-hover:text-white transition-colors" style={{ fontFamily: F_MONO }}>
                Follow ↗
              </span>
            </a>

            {/* X (Twitter) Portal */}
            <a 
              href={SOCIAL_LINKS.twitter}
              target="_blank" 
              rel="noopener noreferrer"
              className="ink-box-social bg-zinc-900 text-white p-4 shadow-[6px_6px_0px_#000] flex items-center justify-between group hover:-translate-y-1 hover:shadow-[8px_8px_0px_#000] transition-all relative overflow-hidden"
            >
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-11 h-11 bg-white text-black flex items-center justify-center text-xl font-black ink-box-social group-hover:rotate-6 transition-transform" style={{ fontFamily: F_SFX }}>
                  𝕏
                </div>
                <div>
                  <span className="text-lg uppercase leading-none block text-white" style={{ fontFamily: F_DISPLAY }}>
                    X Radar
                  </span>
                  <span className="text-[11px] text-zinc-400 font-bold" style={{ fontFamily: F_MONO }}>
                    @otakus__domain
                  </span>
                </div>
              </div>
              <span className="text-xs uppercase font-bold bg-white/10 px-3 py-1 ink-box-social group-hover:bg-white group-hover:text-black transition-colors" style={{ fontFamily: F_MONO }}>
                Connect ↗
              </span>
            </a>

          </div>

        </div>

        {/* Marquee Ticker */}
        <div className="relative z-10 ink-box-social bg-black py-3 px-4 overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,0.8)] flex items-center">
          <div className="bg-[var(--guild-primary)] text-black font-bold uppercase text-xs px-4 py-1 mr-4 ink-box-social shrink-0 z-20" style={{ fontFamily: F_MONO }}>
            COMMUNITY RADAR
          </div>
          
          <div className="overflow-hidden w-full relative">
            <div className="animate-marquee-custom flex gap-12">
              {[...headlines, ...headlines].map((h, i) => (
                <span key={i} className="text-xs uppercase text-white font-bold tracking-wider flex items-center gap-2" style={{ fontFamily: F_MONO }}>
                  <span className="text-[var(--guild-secondary)]">✦</span> {h}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}