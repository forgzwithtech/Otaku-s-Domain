import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { fetchMediaDetails, type DetailedMedia, type CharacterNode } from "../services/anilist";
import {
  getMangaDexData,
  getMangaDexPages,
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

  // State
  const [media, setMedia] = useState<DetailedMedia | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "content">("info");
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterNode | null>(null);

  // Manga States
  const [chapters, setChapters] = useState<MangaDexChapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<MangaDexChapter | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [loadingPages, setLoadingPages] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Reader UX Modes
  const [readerMode, setReaderMode] = useState<"webtoon" | "book">("webtoon");
  const [currentBookPage, setCurrentBookPage] = useState<number>(0);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [pageTurnDirection, setPageTurnDirection] = useState<"next" | "prev" | null>(null);

  // QP Notification Popup
  const [qpNotification, setQpNotification] = useState<string | null>(null);
  const hasClaimedAnimeQp = useRef<boolean>(false);
  const hasClaimedMangaQp = useRef<boolean>(false);
  const readerContainerRef = useRef<HTMLDivElement>(null);

  const previousVaultQuery = searchParams.get("from") || "";
  const backToVaultUrl = previousVaultQuery ? `/vault?${previousVaultQuery}` : "/vault";

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

  // TRIGGER 1: Award 5 QP for interacting with Anime (+5 QP, max 5/day)
  const handleAnimeInteraction = async () => {
    if (hasClaimedAnimeQp.current || !id) return;
    hasClaimedAnimeQp.current = true;

    const res = await claimQuestPoints("ANIME_INTERACT", id);
    if (res?.qpAwarded) {
      setQpNotification(`+${res.qpAwarded} QP Earned! (Daily Broadcast Intel)`);
      setTimeout(() => setQpNotification(null), 4000);
    }
  };

  const handleOpenChapter = async (ch: MangaDexChapter) => {
    setSelectedChapter(ch);
    setLoadingPages(true);
    setActiveTab("content");
    setCurrentBookPage(0);
    hasClaimedMangaQp.current = false; // Reset for new chapter
    const urls = await getMangaDexPages(ch.id);
    setPages(urls);
    setLoadingPages(false);
    window.scrollTo({ top: 380, behavior: "smooth" });
  };

  // TRIGGER 2: Award 10 QP when user reads until the final page (+10 QP, max 20/day)
  const handleMangaCompletion = async () => {
    if (hasClaimedMangaQp.current || !id || !selectedChapter) return;
    hasClaimedMangaQp.current = true;

    const res = await claimQuestPoints("MANGA_COMPLETE", id, selectedChapter.id);
    if (res?.qpAwarded) {
      setQpNotification(`+${res.qpAwarded} QP Earned! (Chapter Intel Decrypted)`);
      setTimeout(() => setQpNotification(null), 4000);
    }
  };

  // Detect scroll to bottom in Webtoon Mode
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

  // Detect final page in Book Mode
  useEffect(() => {
    if (readerMode === "book" && pages.length > 0 && currentBookPage === pages.length - 1) {
      handleMangaCompletion();
    }
  }, [readerMode, currentBookPage, pages]);

  // Chapter Navigation Calculations
  const currentChapterIndex = chapters.findIndex((c) => c.id === selectedChapter?.id);
  const hasPrevChapter = currentChapterIndex > 0;
  const hasNextChapter = currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1;

  const goToPrevChapter = () => {
    if (hasPrevChapter) {
      handleOpenChapter(chapters[currentChapterIndex - 1]);
    }
  };

  const goToNextChapter = () => {
    if (hasNextChapter) {
      handleOpenChapter(chapters[currentChapterIndex + 1]);
    }
  };

  const nextBookPage = useCallback(() => {
    if (currentBookPage < pages.length - 1) {
      setPageTurnDirection("next");
      setTimeout(() => {
        setCurrentBookPage((p) => Math.min(pages.length - 1, p + 1));
        setPageTurnDirection(null);
      }, 150);
    }
  }, [currentBookPage, pages.length]);

  const prevBookPage = useCallback(() => {
    if (currentBookPage > 0) {
      setPageTurnDirection("prev");
      setTimeout(() => {
        setCurrentBookPage((p) => Math.max(0, p - 1));
        setPageTurnDirection(null);
      }, 150);
    }
  }, [currentBookPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedChapter && pages.length > 0) {
        if (readerMode === "book") {
          if (e.key === "ArrowRight" || e.key === "d") nextBookPage();
          if (e.key === "ArrowLeft" || e.key === "a") prevBookPage();
        }
        if (e.key === "f" || e.key === "F") {
          setIsFullScreen((prev) => !prev);
        }
        if (e.key === "Escape" && isFullScreen) {
          setIsFullScreen(false);
        }
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

  return (
    <div className="min-h-screen bg-[#e8e4d8] pt-24 pb-24 px-4 md:px-8 text-black relative">
      {/* Real-time Quest Point Floating Toast Notification */}
      {qpNotification && (
        <div className="fixed top-20 right-6 z-50 bg-black text-yellow-400 border-4 border-yellow-400 p-4 font-black uppercase text-sm shadow-[8px_8px_0px_#000] animate-bounce" style={{ fontFamily: F_MONO }}>
          🏆 {qpNotification}
        </div>
      )}

      <div className="max-w-[100rem] mx-auto">
        {/* Banner */}
        {media.bannerImage && (
          <div className="w-full h-48 md:h-72 border-4 border-black overflow-hidden mb-6 shadow-[10px_10px_0px_#000] relative">
            <img src={media.bannerImage} alt="Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          </div>
        )}

        {/* Top Navigation */}
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
                activeTab === "info"
                  ? "bg-black text-white shadow-[4px_4px_0px_#000]"
                  : "bg-white text-black hover:bg-zinc-200"
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
                activeTab === "content"
                  ? "bg-black text-white shadow-[4px_4px_0px_#000]"
                  : "bg-white text-black hover:bg-zinc-200"
              }`}
              style={{ fontFamily: F_DISPLAY }}
            >
              {media.type === "MANGA"
                ? `📖 Read Vault (${chapters.length > 0 ? `${chapters.length} Chs` : "External Portal"})`
                : "📺 Official Broadcast"}
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW & CHARACTER LORE (DEFAULT)                */}
        {/* ========================================================= */}
        {activeTab === "info" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Cover & Meta */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="border-4 border-black p-2 bg-white shadow-[10px_10px_0px_#000]">
                <img
                  src={media.image}
                  alt={media.title}
                  className="w-full aspect-[2/3] object-cover border-2 border-black"
                />
              </div>

              <div className="border-4 border-black bg-white p-5 shadow-[6px_6px_0px_#000]">
                <span
                  className="text-xs uppercase font-bold text-zinc-500 block mb-2"
                  style={{ fontFamily: F_MONO }}
                >
                  Archive Telemetry
                </span>
                <div className="flex flex-col gap-2 text-xs font-bold" style={{ fontFamily: F_MONO }}>
                  <div className="flex justify-between border-b border-zinc-200 pb-1">
                    <span>Format:</span>
                    <span>{media.format}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-200 pb-1">
                    <span>Status:</span>
                    <span>{media.status}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-200 pb-1">
                    <span>Year:</span>
                    <span>{media.seasonYear || "N/A"}</span>
                  </div>
                  {media.score && (
                    <div className="flex justify-between border-b border-zinc-200 pb-1 text-yellow-600">
                      <span>Rating:</span>
                      <span>★ {media.score}%</span>
                    </div>
                  )}
                  {media.studios.length > 0 && (
                    <div className="flex justify-between pt-1">
                      <span>Studio:</span>
                      <span>{media.studios[0]}</span>
                    </div>
                  )}
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

            {/* Right Lore & Characters */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="border-4 border-black bg-white p-6 md:p-8 shadow-[10px_10px_0px_#000]">
                <div className="flex flex-wrap gap-2 mb-3">
                  {media.genres.map((g, i) => (
                    <span
                      key={i}
                      className="bg-black text-white text-[10px] font-black uppercase px-2.5 py-0.5 border border-black"
                      style={{ fontFamily: F_MONO }}
                    >
                      {g}
                    </span>
                  ))}
                </div>

                <h1
                  className="text-4xl md:text-6xl uppercase tracking-tight text-black mb-2"
                  style={{ fontFamily: F_DISPLAY }}
                >
                  {media.title}
                </h1>
                <p className="text-xs font-bold text-zinc-500 mb-6" style={{ fontFamily: F_MONO }}>
                  {media.romajiTitle} // {media.nativeTitle}
                </p>

                <p
                  className="text-sm md:text-base leading-relaxed text-zinc-800 font-medium"
                  style={{ fontFamily: F_MONO }}
                >
                  {formatBioText(media.description)}
                </p>
              </div>

              {/* Character Grid */}
              {media.characters.length > 0 && (
                <div className="border-4 border-black bg-white p-6 md:p-8 shadow-[10px_10px_0px_#000]">
                  <div className="flex justify-between items-center mb-6 pb-2 border-b-2 border-black">
                    <h3 className="text-3xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
                      Operative & Character Roster ({media.characters.length})
                    </h3>
                    <span
                      className="text-[10px] font-bold uppercase bg-black text-white px-2 py-0.5"
                      style={{ fontFamily: F_MONO }}
                    >
                      Click for Dossier
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {media.characters.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCharacter(c)}
                        className="border-2 border-black p-3 bg-[#e8e4d8] flex flex-col justify-between items-center text-center shadow-[3px_3px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] transition-all cursor-pointer group"
                      >
                        <div className="flex flex-col items-center">
                          <img
                            src={c.image}
                            alt={c.name}
                            className="w-20 h-20 object-cover rounded-full border-2 border-black mb-2 group-hover:scale-105 transition-transform"
                          />
                          <span
                            className="text-xs font-black uppercase line-clamp-1 group-hover:text-red-600 transition-colors"
                            style={{ fontFamily: F_MONO }}
                          >
                            {c.name}
                          </span>
                          <span
                            className="text-[9px] text-zinc-600 font-bold uppercase"
                            style={{ fontFamily: F_MONO }}
                          >
                            {c.role}
                          </span>
                        </div>

                        {c.voiceActor && (
                          <div
                            className="mt-2 pt-2 border-t border-black/10 w-full text-[9px] font-bold text-zinc-600 truncate"
                            style={{ fontFamily: F_MONO }}
                          >
                            VA: {c.voiceActor.name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ADVANCED MANGA READER WITH BOOK FLIP & CONTROLS    */}
        {/* ========================================================= */}
        {activeTab === "content" && (
          <div className="border-4 border-black bg-white p-4 md:p-8 shadow-[10px_10px_0px_#000] mb-8">
            {media.type === "MANGA" ? (
              <div>
                {chapters.length > 0 ? (
                  <div>
                    {/* Top Chapter Control Bar */}
                    <div className="flex flex-wrap justify-between items-center mb-6 pb-4 border-b-2 border-black gap-3">
                      <div>
                        <span
                          className="bg-black text-white text-[10px] font-black uppercase px-2 py-0.5"
                          style={{ fontFamily: F_MONO }}
                        >
                          ✓ IN-VAULT ARCHIVES
                        </span>
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
                            {readerMode === "webtoon" ? "📖 Switch to Book Mode" : "📜 Switch to Webtoon Mode"}
                          </button>

                          <button
                            onClick={() => setIsFullScreen((f) => !f)}
                            className="bg-zinc-900 text-white px-3 py-1.5 font-bold uppercase text-xs border-2 border-black hover:bg-red-600 transition-colors"
                            style={{ fontFamily: F_MONO }}
                          >
                            ⛶ Fullscreen (F)
                          </button>

                          <button
                            onClick={() => {
                              setSelectedChapter(null);
                              setPages([]);
                            }}
                            className="bg-black text-white px-3 py-1.5 text-xs font-bold uppercase border-2 border-black hover:bg-red-600 transition-colors"
                            style={{ fontFamily: F_MONO }}
                          >
                            ✕ Close Chapter
                          </button>
                        </div>
                      )}
                    </div>

                    {/* CHAPTER DISPLAY & INTERACTIVE READER */}
                    {selectedChapter ? (
                      loadingPages ? (
                        <div
                          className="py-28 text-center font-bold uppercase text-zinc-500 tracking-wider"
                          style={{ fontFamily: F_MONO }}
                        >
                          ⚡ Loading High-Resolution Pages from MangaDex @Home Network...
                        </div>
                      ) : pages.length > 0 ? (
                        <div
                          ref={readerContainerRef}
                          className={`${
                            isFullScreen
                              ? "fixed inset-0 z-50 bg-[#0c0c0c] p-4 md:p-8 overflow-y-auto flex flex-col items-center justify-between"
                              : "relative"
                          }`}
                        >
                          {/* Fullscreen HUD Header */}
                          {isFullScreen && (
                            <div className="w-full max-w-5xl flex justify-between items-center text-white bg-black/90 p-3 border-2 border-white/20 mb-4 sticky top-0 z-10">
                              <span className="font-bold text-sm uppercase" style={{ fontFamily: F_DISPLAY }}>
                                {media.title} — {selectedChapter.title}
                              </span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setReaderMode((m) => (m === "webtoon" ? "book" : "webtoon"))}
                                  className="text-xs bg-yellow-400 text-black px-2 py-1 font-bold uppercase"
                                >
                                  {readerMode === "webtoon" ? "Book Mode" : "Webtoon Mode"}
                                </button>
                                <button
                                  onClick={() => setIsFullScreen(false)}
                                  className="text-xs bg-red-600 text-white px-3 py-1 font-bold uppercase"
                                >
                                  Exit Fullscreen (ESC)
                                </button>
                              </div>
                            </div>
                          )}

                          {/* MODE A: WEBTOON CONTINUOUS SCROLL */}
                          {readerMode === "webtoon" && (
                            <div className="flex flex-col items-center gap-4 max-w-4xl mx-auto w-full">
                              {pages.map((url, idx) => (
                                <div key={idx} className="w-full flex flex-col items-center">
                                  <img
                                    src={url}
                                    alt={`Page ${idx + 1}`}
                                    loading="lazy"
                                    className="w-full border-2 border-black shadow-[6px_6px_0px_#000] bg-zinc-100"
                                  />
                                  <span
                                    className={`text-xs font-bold mt-1 mb-4 ${
                                      isFullScreen ? "text-zinc-400" : "text-zinc-600"
                                    }`}
                                    style={{ fontFamily: F_MONO }}
                                  >
                                    Page {idx + 1} of {pages.length}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* MODE B: BOOK FLIP WITH PAGE TURNING */}
                          {readerMode === "book" && (
                            <div className="flex flex-col items-center max-w-4xl mx-auto w-full my-4">
                              <div className="relative w-full aspect-[2/3] max-h-[75vh] flex items-center justify-center select-none">
                                <div
                                  onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const clickX = e.clientX - rect.left;
                                    if (clickX > rect.width / 2) {
                                      nextBookPage();
                                    } else {
                                      prevBookPage();
                                    }
                                  }}
                                  className={`relative h-full max-h-[75vh] border-4 border-black bg-white shadow-[12px_12px_0px_#000] cursor-pointer transition-transform duration-200 overflow-hidden ${
                                    pageTurnDirection === "next"
                                      ? "translate-x-[-10px] rotate-[-1deg]"
                                      : pageTurnDirection === "prev"
                                      ? "translate-x-[10px] rotate-[1deg]"
                                      : ""
                                  }`}
                                >
                                  <img
                                    src={pages[currentBookPage]}
                                    alt={`Page ${currentBookPage + 1}`}
                                    className="h-full w-auto object-contain pointer-events-none"
                                  />

                                  <div className="absolute inset-y-0 left-0 w-1/4 hover:bg-black/10 transition-colors flex items-center justify-start pl-4 text-2xl font-black text-black/40">
                                    ←
                                  </div>
                                  <div className="absolute inset-y-0 right-0 w-1/4 hover:bg-black/10 transition-colors flex items-center justify-end pr-4 text-2xl font-black text-black/40">
                                    →
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 flex items-center gap-4 w-full max-w-md">
                                <button
                                  onClick={prevBookPage}
                                  disabled={currentBookPage === 0}
                                  className="px-3 py-1 bg-black text-white font-bold text-xs uppercase disabled:opacity-30 border border-black"
                                  style={{ fontFamily: F_MONO }}
                                >
                                  ← Prev Page
                                </button>

                                <input
                                  type="range"
                                  min="0"
                                  max={pages.length - 1}
                                  value={currentBookPage}
                                  onChange={(e) => setCurrentBookPage(parseInt(e.target.value, 10))}
                                  className="flex-1 accent-black cursor-pointer"
                                />

                                <button
                                  onClick={nextBookPage}
                                  disabled={currentBookPage === pages.length - 1}
                                  className="px-3 py-1 bg-black text-white font-bold text-xs uppercase disabled:opacity-30 border border-black"
                                  style={{ fontFamily: F_MONO }}
                                >
                                  Next Page →
                                </button>
                              </div>

                              <span
                                className={`text-xs font-bold mt-2 ${
                                  isFullScreen ? "text-zinc-400" : "text-zinc-600"
                                }`}
                                style={{ fontFamily: F_MONO }}
                              >
                                Page {currentBookPage + 1} of {pages.length} (Use ← / → Arrow Keys)
                              </span>
                            </div>
                          )}

                          {/* BOTTOM CHAPTER SELECTOR & PREV/NEXT NAVIGATION BAR */}
                          <div
                            className={`w-full max-w-4xl mx-auto mt-10 pt-6 border-t-4 border-black flex flex-col sm:flex-row items-center justify-between gap-4 p-4 shadow-[6px_6px_0px_#000] ${
                              isFullScreen ? "bg-black text-white border-white" : "bg-[#e8e4d8] text-black"
                            }`}
                          >
                            <button
                              onClick={goToPrevChapter}
                              disabled={!hasPrevChapter}
                              className="w-full sm:w-auto px-5 py-2.5 bg-black text-white font-bold uppercase text-xs border-2 border-black hover:bg-white hover:text-black disabled:opacity-30 transition-colors shadow-[2px_2px_0px_#000]"
                              style={{ fontFamily: F_MONO }}
                            >
                              ← Prev Chapter
                            </button>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <span
                                className={`text-xs font-bold uppercase ${
                                  isFullScreen ? "text-zinc-300" : "text-zinc-700"
                                }`}
                                style={{ fontFamily: F_MONO }}
                              >
                                Chapter:
                              </span>
                              <select
                                value={selectedChapter.id}
                                onChange={(e) => {
                                  const target = chapters.find((c) => c.id === e.target.value);
                                  if (target) handleOpenChapter(target);
                                }}
                                className="flex-1 sm:flex-none bg-white text-black border-2 border-black px-3 py-2 font-bold text-xs uppercase focus:outline-none"
                                style={{ fontFamily: F_MONO }}
                              >
                                {chapters.map((ch) => (
                                  <option key={ch.id} value={ch.id}>
                                    {ch.title}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              onClick={goToNextChapter}
                              disabled={!hasNextChapter}
                              className="w-full sm:w-auto px-5 py-2.5 bg-black text-white font-bold uppercase text-xs border-2 border-black hover:bg-white hover:text-black disabled:opacity-30 transition-colors shadow-[2px_2px_0px_#000]"
                              style={{ fontFamily: F_MONO }}
                            >
                              Next Chapter →
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* INLINE OFFICIAL SOURCE FALLBACK */
                        <div className="py-6">
                          <div className="border-4 border-black p-6 bg-[#e8e4d8] shadow-[6px_6px_0px_#000] mb-6">
                            <span
                              className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 inline-block mb-2"
                              style={{ fontFamily: F_MONO }}
                            >
                              LICENSED CHAPTER
                            </span>
                            <h4 className="text-2xl uppercase font-black mb-2" style={{ fontFamily: F_DISPLAY }}>
                              {selectedChapter.title} Hosted on Official Publisher Gateways
                            </h4>
                            <p
                              className="text-xs md:text-sm font-medium text-zinc-800 leading-relaxed"
                              style={{ fontFamily: F_MONO }}
                            >
                              Scans for this chapter are externalized due to publisher distribution agreements. Access verified
                              releases directly below:
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {externalLinks.map((source, idx) => (
                              <a
                                key={idx}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="border-4 border-black p-5 bg-white shadow-[6px_6px_0px_#000] hover:bg-black hover:text-white hover:-translate-y-1 transition-all group flex flex-col justify-between"
                              >
                                <div>
                                  <span
                                    className="text-[9px] font-black uppercase bg-black text-white group-hover:bg-yellow-400 group-hover:text-black px-2 py-0.5 border border-black mb-2 inline-block"
                                    style={{ fontFamily: F_MONO }}
                                  >
                                    {source.badge}
                                  </span>
                                  <h4 className="text-xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
                                    {source.name}
                                  </h4>
                                </div>
                                <span
                                  className="text-xs font-black uppercase mt-4 pt-2 border-t-2 border-black/10 flex items-center justify-between"
                                  style={{ fontFamily: F_MONO }}
                                >
                                  Launch Chapter <span>↗</span>
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )
                    ) : (
                      /* Chapter List Roster */
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
                  /* When entire series is licensed */
                  <div className="py-4">
                    <div className="border-4 border-black p-6 bg-[#e8e4d8] shadow-[6px_6px_0px_#000] mb-8">
                      <span
                        className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 inline-block mb-2"
                        style={{ fontFamily: F_MONO }}
                      >
                        LICENSED RESTRICTION
                      </span>
                      <h3 className="text-3xl uppercase font-black mb-2" style={{ fontFamily: F_DISPLAY }}>
                        Read on Official Publisher Portals
                      </h3>
                      <p
                        className="text-xs md:text-sm font-medium text-zinc-800 leading-relaxed"
                        style={{ fontFamily: F_MONO }}
                      >
                        Scans for <strong>{media.title}</strong> are protected by publisher licensing and unavailable on
                        public open nodes. Access verified official chapter releases below:
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {externalLinks.map((source, idx) => (
                        <a
                          key={idx}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border-4 border-black p-5 bg-white shadow-[6px_6px_0px_#000] hover:bg-black hover:text-white hover:-translate-y-1 transition-all group flex flex-col justify-between"
                        >
                          <div>
                            <span
                              className="text-[9px] font-black uppercase bg-black text-white group-hover:bg-yellow-400 group-hover:text-black px-2 py-0.5 border border-black mb-2 inline-block"
                              style={{ fontFamily: F_MONO }}
                            >
                              {source.badge}
                            </span>
                            <h4 className="text-xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
                              {source.name}
                            </h4>
                          </div>
                          <span
                            className="text-xs font-black uppercase mt-6 pt-2 border-t-2 border-black/10 flex items-center justify-between"
                            style={{ fontFamily: F_MONO }}
                          >
                            Launch Source <span>↗</span>
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Anime Video Broadcast */
              <div>
                <div className="mb-6 pb-4 border-b-2 border-black">
                  <h3 className="text-3xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
                    Official Video Transmission
                  </h3>
                  <span className="text-xs font-bold text-zinc-500 uppercase" style={{ fontFamily: F_MONO }}>
                    Official Media & Streaming Hub
                  </span>
                </div>

                {media.trailerUrl ? (
                  <div className="aspect-video w-full max-w-5xl mx-auto border-4 border-black shadow-[10px_10px_0px_#000] bg-black overflow-hidden mb-8">
                    <iframe
                      src={`https://www.youtube.com/embed/${media.trailerUrl.split("v=")[1]}`}
                      title={`${media.title} Trailer`}
                      className="w-full h-full border-none"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="py-16 text-center text-zinc-600 font-bold" style={{ fontFamily: F_MONO }}>
                    No public video trailer broadcast available for this entry.
                  </div>
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
                <span
                  className="text-[10px] font-black uppercase bg-black text-white px-2 py-0.5"
                  style={{ fontFamily: F_MONO }}
                >
                  OPERATIVE DOSSIER // {selectedCharacter.role}
                </span>
                <h2 className="text-4xl uppercase font-black mt-1" style={{ fontFamily: F_DISPLAY }}>
                  {selectedCharacter.name}
                </h2>
                {selectedCharacter.nativeName && (
                  <span className="text-xs font-bold text-zinc-600" style={{ fontFamily: F_MONO }}>
                    {selectedCharacter.nativeName}
                  </span>
                )}
              </div>

              <button
                onClick={() => setSelectedCharacter(null)}
                className="bg-black text-white font-black text-sm px-3 py-1 border-2 border-black hover:bg-red-600 transition-colors"
                style={{ fontFamily: F_MONO }}
              >
                CLOSE ✕
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6 mb-6">
              <div className="w-36 h-48 shrink-0 border-2 border-black bg-zinc-900 overflow-hidden shadow-[4px_4px_0px_#000]">
                <img
                  src={selectedCharacter.image}
                  alt={selectedCharacter.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-col gap-2 text-xs font-bold" style={{ fontFamily: F_MONO }}>
                {selectedCharacter.gender && (
                  <div className="border-b border-black/10 pb-1">
                    <span className="text-zinc-500 uppercase">Gender:</span> {selectedCharacter.gender}
                  </div>
                )}
                {selectedCharacter.age && (
                  <div className="border-b border-black/10 pb-1">
                    <span className="text-zinc-500 uppercase">Age:</span> {selectedCharacter.age}
                  </div>
                )}
                {selectedCharacter.voiceActor && (
                  <div className="border-b border-black/10 pb-1">
                    <span className="text-zinc-500 uppercase">Japanese Voice Actor:</span> {selectedCharacter.voiceActor.name}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t-2 border-black pt-4">
              <h4 className="text-lg uppercase font-black mb-2" style={{ fontFamily: F_DISPLAY }}>
                Biography & Backstory
              </h4>
              <p
                className="text-xs md:text-sm leading-relaxed text-zinc-800 whitespace-pre-line font-medium"
                style={{ fontFamily: F_MONO }}
              >
                {formatBioText(selectedCharacter.description)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}