import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchVaultMedia, type VaultMedia } from "../services/anilist";

function useRedLightAssets() {
  useEffect(() => {
    if (document.getElementById("red-light-assets")) return;
    const style = document.createElement("style");
    style.id = "red-light-assets";
    style.innerHTML = `
      .ink-box-danger {
        border: 4px solid #000;
        border-radius: 2px 255px 3px 255px / 255px 5px 225px 3px;
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
      .halftone-red {
        background-image: radial-gradient(rgba(220, 38, 38, 0.4) 1.5px, transparent 1.5px);
        background-size: 8px 8px;
      }
      .glitch-title {
        position: relative;
      }
      .glitch-title::before, .glitch-title::after {
        content: attr(data-text);
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0.8;
      }
      .glitch-title::before {
        left: 3px;
        text-shadow: -2px 0 red;
        clip: rect(24px, 550px, 90px, 0);
        animation: glitch-anim 2s infinite linear alternate-reverse;
      }
      .glitch-title::after {
        left: -3px;
        text-shadow: -2px 0 cyan;
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

export default function RedLightDistrict() {
  useRedLightAssets();
  const [searchParams, setSearchParams] = useSearchParams();

  const mediaType = (searchParams.get("type") as "MANGA" | "ANIME") || "MANGA";
  const search = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [items, setItems] = useState<VaultMedia[]>([]);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const updateParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.set("page", "1");
      return next;
    });
  };

  useEffect(() => {
    async function loadAdultCatalog() {
      setLoading(true);
      try {
        const res = await fetchVaultMedia({
          page,
          perPage: 18,
          type: mediaType,
          search: search || undefined,
          isAdult: true,
          sort: ["POPULARITY_DESC"],
        });
        setItems(res.media);
        setHasNextPage(res.pageInfo.hasNextPage);
      } catch (err) {
        console.error("Failed to load restricted catalog:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAdultCatalog();
  }, [mediaType, page, search]);

  return (
    <div className="min-h-screen bg-[#070707] text-white pt-24 pb-16 px-4 md:px-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-25 pointer-events-none halftone-red" />

      <div className="max-w-[100rem] mx-auto relative z-10">
        {/* Header Banner */}
        <div className="border-4 border-red-600 bg-black/90 p-6 md:p-10 shadow-[16px_16px_0px_#dc2626] ink-box-danger relative overflow-hidden mb-10">
          <div className="absolute top-0 left-0 w-full h-3 hazard-tape" />
          <div className="absolute bottom-0 left-0 w-full h-3 hazard-tape" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 bg-red-600 rounded-full animate-ping" />
                <span
                  className="bg-red-600 text-white font-bold uppercase text-xs px-3 py-1 ink-box-danger"
                  style={{ fontFamily: F_MONO }}
                >
                  LEVEL 18+ CLASSIFIED ZONE
                </span>
              </div>
              <h1
                className="uppercase text-4xl md:text-7xl text-white tracking-tight glitch-title"
                data-text="RED LIGHT DISTRICT"
                style={{ fontFamily: F_DISPLAY, textShadow: "4px 4px 0px red" }}
              >
                Red Light District
              </h1>
            </div>

            <Link
              to="/vault"
              className="bg-white text-black uppercase text-sm px-6 py-3 font-black ink-box-danger hover:bg-red-600 hover:text-white transition-all shadow-[4px_4px_0px_#dc2626] shrink-0"
              style={{ fontFamily: F_DISPLAY }}
            >
              ← Open Main Vault
            </Link>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => updateParam("type", "MANGA")}
              className={`px-5 py-2.5 uppercase font-black text-sm ink-box-danger transition-all ${
                mediaType === "MANGA"
                  ? "bg-red-600 text-white shadow-[4px_4px_0px_#fff]"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
              style={{ fontFamily: F_DISPLAY }}
            >
              📖 Restricted Manga
            </button>
            <button
              onClick={() => updateParam("type", "ANIME")}
              className={`px-5 py-2.5 uppercase font-black text-sm ink-box-danger transition-all ${
                mediaType === "ANIME"
                  ? "bg-red-600 text-white shadow-[4px_4px_0px_#fff]"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
              style={{ fontFamily: F_DISPLAY }}
            >
              🔞 18+ Anime
            </button>
          </div>

          <div className="w-full md:w-80">
            <input
              type="text"
              placeholder="Search classified database..."
              value={search}
              onChange={(e) => updateParam("q", e.target.value)}
              className="w-full bg-zinc-950 border-2 border-red-600/70 p-3 text-sm text-white placeholder-zinc-500 font-bold focus:outline-none focus:border-red-500"
              style={{ fontFamily: F_MONO }}
            />
          </div>
        </div>

        {/* Media Grid */}
        {loading ? (
          <div
            className="py-24 text-center font-bold uppercase text-red-500 tracking-widest"
            style={{ fontFamily: F_MONO }}
          >
            ⚡ Decrypting 18+ Archives from AniList...
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6 mb-12">
            {items.map((item) => (
              <Link
                key={item.id}
                to={`/vault/${item.id}?from=${encodeURIComponent(searchParams.toString())}`}
                className="bg-zinc-950 border-2 border-red-600/50 p-3 flex flex-col justify-between group hover:border-red-500 hover:-translate-y-1 transition-all shadow-[6px_6px_0px_#000] cursor-pointer"
              >
                <div>
                  <div className="aspect-[2/3] w-full border border-red-950 overflow-hidden relative mb-3 bg-black">
                    <span
                      className="absolute top-1.5 left-1.5 bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 z-10 shadow-[2px_2px_0px_#000]"
                      style={{ fontFamily: F_MONO }}
                    >
                      18+
                    </span>
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <span className="text-[9px] text-red-400 font-bold block mb-1" style={{ fontFamily: F_MONO }}>
                    {item.format}
                  </span>
                  <h3
                    className="text-sm uppercase text-white font-bold line-clamp-2 leading-snug group-hover:text-red-400 transition-colors"
                    style={{ fontFamily: F_DISPLAY }}
                  >
                    {item.title}
                  </h3>
                </div>

                <div
                  className="mt-3 pt-2 border-t border-zinc-900 flex justify-between items-center text-[10px] text-zinc-500"
                  style={{ fontFamily: F_MONO }}
                >
                  <span>{item.genres[0] || "Adult"}</span>
                  {item.score && <span className="text-yellow-500 font-bold">★ {item.score}%</span>}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center text-zinc-500 font-bold uppercase" style={{ fontFamily: F_MONO }}>
            No classified records found for this query.
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex justify-center items-center gap-4">
          <button
            onClick={() => updateParam("page", Math.max(1, page - 1).toString())}
            disabled={page === 1 || loading}
            className="px-6 py-2.5 bg-zinc-900 border-2 border-red-600/60 text-white font-bold uppercase text-xs disabled:opacity-30 hover:bg-red-600 transition-colors"
            style={{ fontFamily: F_MONO }}
          >
            ← Previous Page
          </button>
          <span className="text-xs font-bold text-red-500 uppercase" style={{ fontFamily: F_MONO }}>
            Page {page}
          </span>
          <button
            onClick={() => updateParam("page", (page + 1).toString())}
            disabled={!hasNextPage || loading}
            className="px-6 py-2.5 bg-zinc-900 border-2 border-red-600/60 text-white font-bold uppercase text-xs disabled:opacity-30 hover:bg-red-600 transition-colors"
            style={{ fontFamily: F_MONO }}
          >
            Next Page →
          </button>
        </div>
      </div>
    </div>
  );
}