// client/src/pages/VaultMediaDetail.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { fetchMediaDetails, type DetailedMedia, type CharacterNode } from "../services/anilist";
import {
  getMangaDexData,
  getMangaDexPages,
  preloadNextPages,
  getExternalMangaLinks,
  type MangaDexChapter,
} from "../services/mangaDexEngine";
import { claimQuestPoints } from "../services/api";

function formatBioText(rawText: string): string {
  if (!rawText) return "No classified biography on file for this operative.";
  return rawText
    .replace(/~!(.*?)!~/gs, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

export default function VaultMediaDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const [media, setMedia] = useState<DetailedMedia | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "content">("info");
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterNode | null>(null);
  const [characterSearch, setCharacterSearch] = useState<string>("");
  const [showAllCharacters, setShowAllCharacters] = useState<boolean>(false);

  // Manga States
  const [chapters, setChapters] = useState<MangaDexChapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<MangaDexChapter | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [loadingPages, setLoadingPages] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Reader Modes
  const [readerMode, setReaderMode] = useState<"webtoon" | "book">("webtoon");
  const [currentBookPage, setCurrentBookPage] = useState<number>(0);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [isDualSpread, setIsDualSpread] = useState<boolean>(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // QP Award
  const [qpNotification, setQpNotification] = useState<string | null>(null);
  const hasClaimedAnimeQp = useRef<boolean>(false);
  const hasClaimedMangaQp = useRef<boolean>(false);

  const previousVaultQuery = searchParams.get("from") || "";
  const backToVaultUrl = previousVaultQuery ? `/vault?${previousVaultQuery}` : "/vault";

  useEffect(() => {
    const checkWidth = () => {
      setIsDualSpread(window.innerWidth >= 1024);
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setLoading(true);
      try {
        const data = await fetchMediaDetails(parseInt(id, 10));
        setMedia(data);

        if (data.type === "MANGA") {
          const { chapters: chs } = await getMangaDexData(data.title, data.romajiTitle);
          setChapters(chs);
        }
      } catch (err) {
        console.error("Failed to load details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleAnimeInteraction = async () => {
    if (hasClaimedAnimeQp.current || !id) return;
    hasClaimedAnimeQp.current = true;
    const res = await claimQuestPoints("ANIME_INTERACT", id);
    if (res?.qpAwarded) {
      setQpNotification(`+${res.qpAwarded} QP Earned! (Broadcast Intel Recorded)`);
      setTimeout(() => setQpNotification(null), 4000);
    }
  };

  const handleOpenChapter = async (ch: MangaDexChapter) => {
    setSelectedChapter(ch);
    setLoadingPages(true);
    setActiveTab("content");
    setCurrentBookPage(0);
    hasClaimedMangaQp.current = false;
    const urls = await getMangaDexPages(ch.id);
    setPages(urls);
    setLoadingPages(false);
    window.scrollTo({ top: 380, behavior: "smooth" });
  };

  const handleMangaCompletion = async () => {
    if (hasClaimedMangaQp.current || !id || !selectedChapter) return;
    hasClaimedMangaQp.current = true;
    const res = await claimQuestPoints("MANGA_COMPLETE", id, selectedChapter.id);
    if (res?.qpAwarded) {
      setQpNotification(`+${res.qpAwarded} QP Earned! (Chapter Decrypted)`);
      setTimeout(() => setQpNotification(null), 4000);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (readerMode === "webtoon" && selectedChapter && pages.length > 0 && !hasClaimedMangaQp.current) {
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 300) {
          handleMangaCompletion();
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [readerMode, selectedChapter, pages]);

  const pageSizeStep = isDualSpread ? 2 : 1;

  const nextBookPage = useCallback(() => {
    if (currentBookPage < pages.length - 1) {
      const nextIndex = Math.min(pages.length - 1, currentBookPage + pageSizeStep);
      setCurrentBookPage(nextIndex);
      preloadNextPages(pages, nextIndex);
      if (nextIndex >= pages.length - 1) handleMangaCompletion();
    }
  }, [currentBookPage, pages, pageSizeStep]);

  const prevBookPage = useCallback(() => {
    if (currentBookPage > 0) {
      setCurrentBookPage((p) => Math.max(0, p - pageSizeStep));
    }
  }, [currentBookPage, pageSizeStep]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (diff > 50) nextBookPage();
    else if (diff < -50) prevBookPage();
    setTouchStartX(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedChapter && pages.length > 0) {
        if (readerMode === "book") {
          if (e.key === "ArrowRight" || e.key === "d") nextBookPage();
          if (e.key === "ArrowLeft" || e.key === "a") prevBookPage();
        }
        if (e.key === "f" || e.key === "F") setIsFullScreen((prev) => !prev);
        if (e.key === "Escape" && isFullScreen) setIsFullScreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedChapter, pages, readerMode, isFullScreen, nextBookPage, prevBookPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e8e4d8] pt-36 text-center font-bold text-black" style={{ fontFamily: F_MONO }}>
        ⚡ DECRYPTING VAULT ARCHIVE TELEMETRY...
      </div>
    );
  }

  if (!media) {
    return (
      <div className="min-h-screen bg-[#e8e4d8] pt-36 text-center font-bold text-black" style={{ fontFamily: F_MONO }}>
        ENTRY NOT FOUND IN VAULT ARCHIVES.
      </div>
    );
  }

  const externalLinks = getExternalMangaLinks(media.title);

  const filteredCharacters = media.characters.filter((c) => {
    if (!characterSearch.trim()) return true;
    const q = characterSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.nativeName && c.nativeName.toLowerCase().includes(q)) ||
      (c.voiceActor && c.voiceActor.name.toLowerCase().includes(q)) ||
      c.role.toLowerCase().includes(q)
    );
  });

  const displayedCharacters = showAllCharacters || characterSearch.trim()
    ? filteredCharacters 
    : filteredCharacters.slice(0, 10);

  return (
    <div className="min-h-screen bg-[#e8e4d8] pt-24 pb-24 px-4 md:px-8 text-black relative">
      {qpNotification && (
        <div className="fixed top-20 right-6 z-50 bg-black text-yellow-400 border-4 border-yellow-400 p-4 font-black uppercase text-sm shadow-[8px_8px_0px_#000] animate-bounce" style={{ fontFamily: F_MONO }}>
          🏆 {qpNotification}
        </div>
      )}

      <div className="max-w-[100rem] mx-auto">
        {media.bannerImage && (
          <div className="w-full h-48 md:h-72 border-4 border-black overflow-hidden mb-6 shadow-[10px_10px_0px_#000] relative">
            <img src={media.bannerImage} alt="Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          </div>
        )}

        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <Link
            to={backToVaultUrl}
            className="bg-black text-white px-5 py-2 uppercase font-black text-xs border-2 border-black hover:bg-white hover:text-black transition-colors"
            style={{ fontFamily: F_MONO }}
          >
            ← Return to Vault Archive
          </Link>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("info")}
              className={`px-6 py-2 uppercase text-sm font-black border-2 border-black transition-all ${
                activeTab === "info" ? "bg-black text-white shadow-[4px_4px_0px_#000]" : "bg-white text-black hover:bg-zinc-200"
              }`}
              style={{ fontFamily: F_DISPLAY }}
            >
              Overview & Operative Dossiers
            </button>
            <button
              onClick={() => {
                setActiveTab("content");
                if (media.type === "ANIME") handleAnimeInteraction();
              }}
              className={`px-6 py-2 uppercase text-sm font-black border-2 border-black transition-all ${
                activeTab === "content" ? "bg-black text-white shadow-[4px_4px_0px_#000]" : "bg-white text-black hover:bg-zinc-200"
              }`}
              style={{ fontFamily: F_DISPLAY }}
            >
              {media.type === "MANGA" ? `📖 Read Vault (${chapters.length > 0 ? `${chapters.length} Chs` : "External Portal"})` : "📺 Official Broadcast"}
            </button>
          </div>
        </div>

        {/* TAB 1: OVERVIEW & COMPLETE CHARACTER ROSTER */}
        {activeTab === "info" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="border-4 border-black p-2 bg-white shadow-[10px_10px_0px_#000]">
                <img src={media.image} alt={media.title} className="w-full aspect-[2/3] object-cover border-2 border-black" />
              </div>

              <div className="border-4 border-black bg-white p-5 shadow-[6px_6px_0px_#000]">
                <span className="text-xs uppercase font-bold text-zinc-500 block mb-2" style={{ fontFamily: F_MONO }}>Archive Telemetry</span>
                <div className="flex flex-col gap-2 text-xs font-bold" style={{ fontFamily: F_MONO }}>
                  <div className="flex justify-between border-b border-zinc-200 pb-1"><span>Format:</span><span>{media.format}</span></div>
                  <div className="flex justify-between border-b border-zinc-200 pb-1"><span>Status:</span><span>{media.status}</span></div>
                  <div className="flex justify-between border-b border-zinc-200 pb-1"><span>Year:</span><span>{media.seasonYear || "N/A"}</span></div>
                  {media.score && <div className="flex justify-between border-b border-zinc-200 pb-1 text-yellow-600"><span>Rating:</span><span>★ {media.score}%</span></div>}
                  {media.studios.length > 0 && <div className="flex justify-between pt-1"><span>Studio:</span><span>{media.studios[0]}</span></div>}
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveTab("content");
                  if (media.type === "ANIME") handleAnimeInteraction();
                }}
                className="w-full bg-black text-white p-4 font-black uppercase text-sm border-4 border-black hover:bg-[var(--guild-primary)] hover:text-black transition-all shadow-[6px_6px_0px_#000]"
                style={{ fontFamily: F_DISPLAY }}
              >
                {media.type === "MANGA" ? "Open Manga Reader ↗" : "Watch Official Transmission ↗"}
              </button>
            </div>

            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="border-4 border-black bg-white p-6 md:p-8 shadow-[10px_10px_0px_#000]">
                <div className="flex flex-wrap gap-2 mb-3">
                  {media.genres.map((g, i) => (
                    <span key={i} className="bg-black text-white text-[10px] font-black uppercase px-2.5 py-0.5 border border-black" style={{ fontFamily: F_MONO }}>{g}</span>
                  ))}
                </div>

                <h1 className="text-4xl md:text-6xl uppercase tracking-tight text-black mb-2" style={{ fontFamily: F_DISPLAY }}>{media.title}</h1>
                <p className="text-xs font-bold text-zinc-500 mb-6" style={{ fontFamily: F_MONO }}>{media.romajiTitle} // {media.nativeTitle}</p>
                <p className="text-sm md:text-base leading-relaxed text-zinc-800 font-medium" style={{ fontFamily: F_MONO }}>{formatBioText(media.description)}</p>
              </div>

              {/* Complete Character Roster with In-Memory Search */}
              {media.characters.length > 0 && (
                <div className="border-4 border-black bg-white p-6 md:p-8 shadow-[10px_10px_0px_#000]">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b-2 border-black gap-3">
                    <div>
                      <h3 className="text-3xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
                        Operative & Character Roster ({media.characters.length})
                      </h3>
                      <span className="text-[10px] font-bold uppercase text-zinc-500" style={{ fontFamily: F_MONO }}>
                        All indexed characters on record
                      </span>
                    </div>

                    <div className="w-full sm:w-auto relative">
                      <input
                        type="text"
                        placeholder="Search operative or VA..."
                        value={characterSearch}
                        onChange={(e) => setCharacterSearch(e.target.value)}
                        className="bg-[#e8e4d8] border-2 border-black px-3 py-1.5 text-xs font-bold uppercase focus:outline-none focus:bg-white w-full sm:w-60"
                        style={{ fontFamily: F_MONO }}
                      />
                      {characterSearch && (
                        <button
                          onClick={() => setCharacterSearch("")}
                          className="absolute right-2.5 top-1.5 text-xs font-black text-zinc-500 hover:text-black"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {displayedCharacters.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                      {displayedCharacters.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCharacter(c)}
                          className="border-2 border-black p-3 bg-[#e8e4d8] flex flex-col justify-between items-center text-center shadow-[3px_3px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] transition-all cursor-pointer group"
                        >
                          <div className="flex flex-col items-center">
                            <img src={c.image} alt={c.name} className="w-16 h-16 object-cover rounded-full border-2 border-black mb-2 group-hover:scale-105 transition-transform" />
                            <span className="text-xs font-black uppercase line-clamp-1 group-hover:text-red-600 transition-colors" style={{ fontFamily: F_MONO }}>{c.name}</span>
                            <span className="text-[9px] text-zinc-600 font-bold uppercase" style={{ fontFamily: F_MONO }}>{c.role}</span>
                          </div>
                          {c.voiceActor && (
                            <div className="mt-2 pt-1.5 border-t border-black/10 w-full text-[9px] font-bold text-zinc-600 truncate" style={{ fontFamily: F_MONO }}>
                              VA: {c.voiceActor.name}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs font-bold text-zinc-500 uppercase" style={{ fontFamily: F_MONO }}>
                      No operative matching "{characterSearch}" found.
                    </div>
                  )}

                  {filteredCharacters.length > 10 && !characterSearch && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => setShowAllCharacters((prev) => !prev)}
                        className="px-6 py-2.5 bg-black text-white hover:bg-yellow-400 hover:text-black border-2 border-black font-black uppercase text-xs transition-colors shadow-[3px_3px_0px_#000]"
                        style={{ fontFamily: F_MONO }}
                      >
                        {showAllCharacters ? "▲ Collapse Operative Roster" : `▼ Reveal All ${filteredCharacters.length} Operatives`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MANGA READER & VIEWPORT OVERFLOW FIX */}
        {activeTab === "content" && (
          <div className="border-4 border-black bg-white p-4 md:p-8 shadow-[10px_10px_0px_#000] mb-8">
            {media.type === "MANGA" ? (
              <div>
                {chapters.length > 0 ? (
                  <div>
                    <div className="flex flex-wrap justify-between items-center mb-6 pb-4 border-b-2 border-black gap-3">
                      <div>
                        <span className="bg-black text-white text-[10px] font-black uppercase px-2 py-0.5" style={{ fontFamily: F_MONO }}>✓ IN-VAULT ARCHIVES</span>
                        <h3 className="text-2xl md:text-3xl uppercase font-black mt-1" style={{ fontFamily: F_DISPLAY }}>
                          {selectedChapter ? selectedChapter.title : `Available Chapters (${chapters.length})`}
                        </h3>
                      </div>

                      {selectedChapter && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setReaderMode((m) => (m === "webtoon" ? "book" : "webtoon"))}
                            className="bg-yellow-400 text-black px-3 py-1.5 font-bold uppercase text-xs border-2 border-black hover:bg-black hover:text-white transition-colors"
                            style={{ fontFamily: F_MONO }}
                          >
                            {readerMode === "webtoon" ? "📖 Book Mode (Flip/Swipe)" : "📜 Webtoon (Vertical)"}
                          </button>
                          <button
                            onClick={() => setIsFullScreen(true)}
                            className="bg-zinc-900 text-white px-3 py-1.5 font-bold uppercase text-xs border-2 border-black hover:bg-red-600 transition-colors"
                            style={{ fontFamily: F_MONO }}
                          >
                            ⛶ Fullscreen (F)
                          </button>
                          <button
                            onClick={() => { setSelectedChapter(null); setPages([]); }}
                            className="bg-black text-white px-3 py-1.5 text-xs font-bold uppercase border-2 border-black hover:bg-red-600 transition-colors"
                            style={{ fontFamily: F_MONO }}
                          >
                            ✕ Close Chapter
                          </button>
                        </div>
                      )}
                    </div>

                    {selectedChapter ? (
                      loadingPages ? (
                        <div className="py-28 text-center font-bold uppercase text-zinc-500 tracking-wider" style={{ fontFamily: F_MONO }}>
                          ⚡ Decrypting high-speed page streams...
                        </div>
                      ) : pages.length > 0 ? (
                        <div
                          onTouchStart={handleTouchStart}
                          onTouchEnd={handleTouchEnd}
                          className={`${
                            isFullScreen 
                              ? "fixed inset-0 z-50 bg-[#0c0c0c] w-screen max-w-[100vw] h-screen p-4 md:p-6 overflow-y-auto overflow-x-hidden flex flex-col justify-between box-border" 
                              : "relative select-none"
                          }`}
                        >
                          {/* Single Unified Cyber-HUD Exit Button */}
                          {isFullScreen && (
                            <div className="w-full max-w-7xl mx-auto flex justify-between items-center bg-black/95 text-white border-2 border-white/30 px-4 py-2.5 mb-4 sticky top-0 z-50 backdrop-blur shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => setIsFullScreen(false)}
                                  className="bg-red-600 text-white font-black uppercase text-xs px-3.5 py-1.5 border border-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                                  style={{ fontFamily: F_MONO }}
                                >
                                  ✕ Exit Fullscreen (ESC)
                                </button>
                                <span className="font-bold text-xs md:text-sm uppercase truncate max-w-xs md:max-w-md" style={{ fontFamily: F_DISPLAY }}>
                                  {media.title} — {selectedChapter.title}
                                </span>
                              </div>

                              <button
                                onClick={() => setReaderMode((m) => (m === "webtoon" ? "book" : "webtoon"))}
                                className="bg-yellow-400 text-black px-3 py-1 text-xs font-bold uppercase border border-black hover:bg-white"
                                style={{ fontFamily: F_MONO }}
                              >
                                {readerMode === "webtoon" ? "Switch to Book Mode" : "Switch to Webtoon"}
                              </button>
                            </div>
                          )}

                          {/* Webtoon Mode */}
                          {readerMode === "webtoon" && (
                            <div className="flex flex-col items-center gap-4 max-w-4xl mx-auto w-full px-2">
                              {pages.map((url, idx) => (
                                <div key={idx} className="w-full flex flex-col items-center">
                                  <img src={url} alt={`Page ${idx + 1}`} loading="lazy" className="w-full max-w-full border-2 border-black shadow-[6px_6px_0px_#000] bg-zinc-100 object-contain" />
                                  <span className={`text-xs font-bold mt-1 mb-4 ${isFullScreen ? "text-zinc-400" : "text-zinc-600"}`} style={{ fontFamily: F_MONO }}>
                                    Page {idx + 1} of {pages.length}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Dual & Single Page Book Mode (Right-overflow protected) */}
                          {readerMode === "book" && (
                            <div className="flex flex-col items-center max-w-5xl mx-auto w-full my-auto px-2 overflow-hidden">
                              <div className="relative w-full flex items-center justify-center gap-2 max-h-[75vh] overflow-hidden py-2">
                                <div
                                  onClick={prevBookPage}
                                  className="relative max-h-[72vh] border-4 border-black bg-white shadow-[10px_10px_0px_#000] cursor-pointer transition-transform active:scale-[0.99] flex items-center justify-center overflow-hidden"
                                >
                                  <img src={pages[currentBookPage]} alt={`Page ${currentBookPage + 1}`} className="h-full max-h-[72vh] max-w-[45vw] w-auto object-contain pointer-events-none" />
                                </div>

                                {isDualSpread && currentBookPage + 1 < pages.length && (
                                  <div
                                    onClick={nextBookPage}
                                    className="relative max-h-[72vh] border-4 border-black bg-white shadow-[10px_10px_0px_#000] cursor-pointer transition-transform active:scale-[0.99] flex items-center justify-center overflow-hidden"
                                  >
                                    <img src={pages[currentBookPage + 1]} alt={`Page ${currentBookPage + 2}`} className="h-full max-h-[72vh] max-w-[45vw] w-auto object-contain pointer-events-none" />
                                  </div>
                                )}
                              </div>

                              <div className="mt-4 flex items-center gap-4 w-full max-w-md">
                                <button onClick={prevBookPage} disabled={currentBookPage === 0} className="px-3 py-1 bg-black text-white font-bold text-xs uppercase disabled:opacity-30 border border-black" style={{ fontFamily: F_MONO }}>
                                  ← Prev
                                </button>
                                <input
                                  type="range"
                                  min="0"
                                  max={pages.length - 1}
                                  value={currentBookPage}
                                  onChange={(e) => setCurrentBookPage(parseInt(e.target.value, 10))}
                                  className="flex-1 accent-black cursor-pointer"
                                />
                                <button onClick={nextBookPage} disabled={currentBookPage >= pages.length - 1} className="px-3 py-1 bg-black text-white font-bold text-xs uppercase disabled:opacity-30 border border-black" style={{ fontFamily: F_MONO }}>
                                  Next →
                                </button>
                              </div>

                              <span className={`text-xs font-bold mt-2 ${isFullScreen ? "text-zinc-400" : "text-zinc-600"}`} style={{ fontFamily: F_MONO }}>
                                Page {currentBookPage + 1} {isDualSpread && currentBookPage + 1 < pages.length ? `& ${currentBookPage + 2}` : ''} of {pages.length} (Swipe or use ← / →)
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-6">
                          <div className="border-4 border-black p-6 bg-[#e8e4d8] shadow-[6px_6px_0px_#000] mb-6">
                            <h4 className="text-2xl uppercase font-black mb-2" style={{ fontFamily: F_DISPLAY }}>Official Publisher Portal</h4>
                            <p className="text-xs font-medium text-zinc-800" style={{ fontFamily: F_MONO }}>This chapter is externalized due to licensing agreements.</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {externalLinks.map((source, idx) => (
                              <a key={idx} href={source.url} target="_blank" rel="noopener noreferrer" className="border-4 border-black p-5 bg-white shadow-[6px_6px_0px_#000] hover:bg-black hover:text-white transition-all">
                                <span className="text-[9px] font-black uppercase bg-black text-white px-2 py-0.5 mb-2 inline-block" style={{ fontFamily: F_MONO }}>{source.badge}</span>
                                <h4 className="text-xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>{source.name}</h4>
                              </a>
                            ))}
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-[600px] overflow-y-auto pr-2">
                        {chapters.map((ch) => (
                          <button
                            key={ch.id}
                            onClick={() => handleOpenChapter(ch)}
                            className="p-3 border-2 border-black bg-[#e8e4d8] text-left font-bold text-xs hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_#000] truncate group flex justify-between items-center"
                            style={{ fontFamily: F_MONO }}
                          >
                            <span className="truncate">{ch.title}</span>
                            <span className="text-[10px] ml-1 opacity-60 group-hover:opacity-100">Read ↗</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-4">
                    <div className="border-4 border-black p-6 bg-[#e8e4d8] shadow-[6px_6px_0px_#000] mb-8">
                      <h3 className="text-3xl uppercase font-black mb-2" style={{ fontFamily: F_DISPLAY }}>Read on Official Portals</h3>
                      <p className="text-xs font-medium text-zinc-800" style={{ fontFamily: F_MONO }}>Scans for <strong>{media.title}</strong> are hosted exclusively via official portals.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {externalLinks.map((source, idx) => (
                        <a key={idx} href={source.url} target="_blank" rel="noopener noreferrer" className="border-4 border-black p-5 bg-white shadow-[6px_6px_0px_#000] hover:bg-black hover:text-white transition-all">
                          <span className="text-[9px] font-black uppercase bg-black text-white px-2 py-0.5 mb-2 inline-block" style={{ fontFamily: F_MONO }}>{source.badge}</span>
                          <h4 className="text-xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>{source.name}</h4>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-6 pb-4 border-b-2 border-black">
                  <h3 className="text-3xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>Official Video Transmission</h3>
                </div>
                {media.trailerUrl ? (
                  <div className="aspect-video w-full max-w-5xl mx-auto border-4 border-black shadow-[10px_10px_0px_#000] bg-black overflow-hidden mb-8">
                    <iframe src={`https://www.youtube.com/embed/${media.trailerUrl.split("v=")[1]}`} title={`${media.title} Trailer`} className="w-full h-full border-none" allowFullScreen />
                  </div>
                ) : (
                  <div className="py-16 text-center text-zinc-600 font-bold" style={{ fontFamily: F_MONO }}>No public video trailer broadcast available.</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: CHARACTER DOSSIER */}
      {selectedCharacter && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#e8e4d8] border-4 border-black p-6 md:p-8 max-w-2xl w-full shadow-[14px_14px_0px_#000] relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-3">
              <div>
                <span className="text-[10px] font-black uppercase bg-black text-white px-2 py-0.5" style={{ fontFamily: F_MONO }}>OPERATIVE DOSSIER // {selectedCharacter.role}</span>
                <h2 className="text-4xl uppercase font-black mt-1" style={{ fontFamily: F_DISPLAY }}>{selectedCharacter.name}</h2>
              </div>
              <button onClick={() => setSelectedCharacter(null)} className="bg-black text-white font-black text-sm px-3 py-1 border-2 border-black hover:bg-red-600 transition-colors" style={{ fontFamily: F_MONO }}>
                CLOSE ✕
              </button>
            </div>
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              <img src={selectedCharacter.image} alt={selectedCharacter.name} className="w-36 h-48 shrink-0 border-2 border-black object-cover" />
              <div className="flex flex-col gap-2 text-xs font-bold" style={{ fontFamily: F_MONO }}>
                {selectedCharacter.gender && <div><span className="text-zinc-500 uppercase">Gender:</span> {selectedCharacter.gender}</div>}
                {selectedCharacter.age && <div><span className="text-zinc-500 uppercase">Age:</span> {selectedCharacter.age}</div>}
                {selectedCharacter.voiceActor && <div><span className="text-zinc-500 uppercase">Japanese VA:</span> {selectedCharacter.voiceActor.name}</div>}
              </div>
            </div>
            <p className="text-xs leading-relaxed text-zinc-800" style={{ fontFamily: F_MONO }}>{formatBioText(selectedCharacter.description)}</p>
          </div>
        </div>
      )}
    </div>
  );
}