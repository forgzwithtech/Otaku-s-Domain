import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchVaultMedia, type VaultMedia } from "../services/anilist";

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

const GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Supernatural",
  "Psychological",
];

const SORT_OPTIONS = [
  { label: "🔥 Trending Now", value: "TRENDING_DESC" },
  { label: "⭐ Highest Rated", value: "SCORE_DESC" },
  { label: "👑 Most Popular", value: "POPULARITY_DESC" },
  { label: "📜 Most Chapters / Episodes", value: "CHAPTERS_DESC" },
  { label: "⚡ Newly Released", value: "START_DATE_DESC" },
];

export default function Vault() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read state directly from URL query parameters (or defaults)
  const mediaType = (searchParams.get("type") as "ANIME" | "MANGA") || "ANIME";
  const search = searchParams.get("q") || "";
  const selectedGenre = searchParams.get("genre") || "";
  const sortOption = searchParams.get("sort") || "POPULARITY_DESC";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [items, setItems] = useState<VaultMedia[]>([]);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to update specific search param keys
  const updateParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      if (key !== "page") {
        next.set("page", "1"); // Reset pagination on filter changes
      }
      return next;
    });
  };

  useEffect(() => {
    async function loadCatalog() {
      setLoading(true);
      try {
        // Resolve dynamic sort array for AniList
        let sortArray = [sortOption];
        if (sortOption === "CHAPTERS_DESC") {
          sortArray = mediaType === "ANIME" ? ["EPISODES_DESC"] : ["CHAPTERS_DESC"];
        }

        const res = await fetchVaultMedia({
          page,
          perPage: 24,
          type: mediaType,
          search: search || undefined,
          isAdult: false,
          sort: sortArray,
        });

        let filtered = res.media;
        if (selectedGenre) {
          filtered = filtered.filter((m) => m.genres.includes(selectedGenre));
        }

        setItems(filtered);
        setHasNextPage(res.pageInfo.hasNextPage);
      } catch (err) {
        console.error("Vault Catalog load failed:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, [mediaType, page, search, selectedGenre, sortOption]);

  return (
    <div className="min-h-screen bg-[#e8e4d8] pt-24 pb-20 px-4 md:px-8 text-black">
      <div className="max-w-[100rem] mx-auto">
        {/* Header */}
        <div className="border-4 border-black bg-white p-6 md:p-10 shadow-[12px_12px_0px_#000] mb-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span
                className="text-xs uppercase font-bold text-zinc-500 block mb-1 tracking-widest"
                style={{ fontFamily: F_MONO }}
              >
                ARCHIVE TERMINAL // EXPANDED CATALOG
              </span>
              <h1
                className="text-5xl md:text-7xl uppercase tracking-tight text-black"
                style={{ fontFamily: F_DISPLAY }}
              >
                The Grand Vault
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <span
                className="text-xs font-bold uppercase bg-black text-white px-3 py-1.5 ink-box-vault"
                style={{ fontFamily: F_MONO }}
              >
                {mediaType === "ANIME" ? "Anime Database" : "Manga Database"}
              </span>
            </div>
          </div>
        </div>

        {/* Master Controls & Filter Bar */}
        <div className="flex flex-col gap-4 mb-8 bg-white border-4 border-black p-5 shadow-[8px_8px_0px_#000]">
          {/* Top Row: Type Switchers + Search */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => updateParam("type", "ANIME")}
                className={`px-6 py-2.5 uppercase font-black text-sm border-2 border-black transition-all ${
                  mediaType === "ANIME"
                    ? "bg-black text-white shadow-[4px_4px_0px_#000]"
                    : "bg-[#e8e4d8] text-black hover:bg-zinc-200"
                }`}
                style={{ fontFamily: F_DISPLAY }}
              >
                📺 Anime Archives
              </button>
              <button
                onClick={() => updateParam("type", "MANGA")}
                className={`px-6 py-2.5 uppercase font-black text-sm border-2 border-black transition-all ${
                  mediaType === "MANGA"
                    ? "bg-black text-white shadow-[4px_4px_0px_#000]"
                    : "bg-[#e8e4d8] text-black hover:bg-zinc-200"
                }`}
                style={{ fontFamily: F_DISPLAY }}
              >
                📖 Manga Archives
              </button>
            </div>

            {/* Keyword Search */}
            <div className="relative flex-1 md:max-w-md">
              <input
                type="text"
                placeholder="Search titles, authors, franchises..."
                value={search}
                onChange={(e) => updateParam("q", e.target.value)}
                className="w-full bg-[#e8e4d8] border-2 border-black p-2.5 font-bold text-xs uppercase placeholder-zinc-500 focus:outline-none focus:bg-white"
                style={{ fontFamily: F_MONO }}
              />
              {search && (
                <button
                  onClick={() => updateParam("q", "")}
                  className="absolute right-3 top-2.5 text-xs font-black text-zinc-500 hover:text-black"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: Genre Filter + Sort Selectors */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t-2 border-black/10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase text-zinc-600" style={{ fontFamily: F_MONO }}>
                Genre:
              </span>
              <select
                value={selectedGenre}
                onChange={(e) => updateParam("genre", e.target.value)}
                className="bg-[#e8e4d8] border-2 border-black p-2 font-bold text-xs uppercase focus:outline-none"
                style={{ fontFamily: F_MONO }}
              >
                <option value="">All Genres</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase text-zinc-600" style={{ fontFamily: F_MONO }}>
                Order By:
              </span>
              <select
                value={sortOption}
                onChange={(e) => updateParam("sort", e.target.value)}
                className="bg-[#e8e4d8] border-2 border-black p-2 font-bold text-xs uppercase focus:outline-none"
                style={{ fontFamily: F_MONO }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Media Grid */}
        {loading ? (
          <div
            className="py-32 text-center font-bold text-zinc-500 uppercase tracking-widest"
            style={{ fontFamily: F_MONO }}
          >
            ⚡ Synchronizing Vault Telemetry...
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6 mb-12">
            {items.map((item) => (
              <Link
                key={item.id}
                to={`/vault/${item.id}?from=${encodeURIComponent(searchParams.toString())}`}
                className="border-2 border-black bg-white p-3 flex flex-col justify-between shadow-[5px_5px_0px_#000] hover:-translate-y-1.5 hover:shadow-[9px_9px_0px_#000] transition-all group cursor-pointer"
              >
                <div>
                  <div className="aspect-[2/3] w-full border border-black overflow-hidden relative mb-2 bg-zinc-900">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {item.score && (
                      <span
                        className="absolute top-1.5 right-1.5 bg-black/80 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 border border-black"
                        style={{ fontFamily: F_MONO }}
                      >
                        ★ {item.score}%
                      </span>
                    )}
                  </div>
                  <span
                    className="text-[9px] uppercase font-bold text-zinc-500 block mb-1"
                    style={{ fontFamily: F_MONO }}
                  >
                    {item.format}
                  </span>
                  <h3
                    className="text-sm uppercase font-black line-clamp-2 leading-snug group-hover:text-red-600 transition-colors"
                    style={{ fontFamily: F_DISPLAY }}
                  >
                    {item.title}
                  </h3>
                </div>

                <div
                  className="mt-3 pt-2 border-t border-zinc-200 flex flex-wrap gap-1"
                  style={{ fontFamily: F_MONO }}
                >
                  {item.genres.slice(0, 2).map((g, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] uppercase font-black bg-black text-white px-1.5 py-0.5"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center text-zinc-500 font-bold uppercase" style={{ fontFamily: F_MONO }}>
            No vault entries matching your filters.
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex justify-center items-center gap-4">
          <button
            onClick={() => updateParam("page", Math.max(1, page - 1).toString())}
            disabled={page === 1 || loading}
            className="px-6 py-2.5 bg-black text-white font-black uppercase text-xs disabled:opacity-30 border-2 border-black hover:bg-white hover:text-black transition-colors"
            style={{ fontFamily: F_DISPLAY }}
          >
            ← Previous Page
          </button>
          <span className="text-xs font-bold uppercase px-3 py-1 bg-white border-2 border-black" style={{ fontFamily: F_MONO }}>
            Page {page}
          </span>
          <button
            onClick={() => updateParam("page", (page + 1).toString())}
            disabled={!hasNextPage || loading}
            className="px-6 py-2.5 bg-black text-white font-black uppercase text-xs disabled:opacity-30 border-2 border-black hover:bg-white hover:text-black transition-colors"
            style={{ fontFamily: F_DISPLAY }}
          >
            Next Page →
          </button>
        </div>
      </div>
    </div>
  );
}