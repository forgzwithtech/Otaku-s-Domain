// src/pages/Forum.tsx
import React, { useState, useEffect, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { 
  fetchForumCategories, 
  fetchForumThreads, 
  createForumThread, 
  toggleThreadLike, 
  toggleRepost,
  fetchNotifications,
  markNotificationsAsRead 
} from "../services/forumApi";
import { fetchVaultMedia, type VaultMedia } from "../services/anilist";
import { uploadMediaAsset } from "../services/storage";
import GenderGatekeeperModal from "../components/forum/GenderGatekeeperModal";
import ForumFloatingDock from "../components/forum/ForumFloatingDock";
import OperativeProfileModal from "../components/forum/OperativeProfileModal";
import { supabase } from "../lib/supabase";
import { needsGenderDeclaration } from "../utils/genter";

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

function useForumMangaAssets() {
  useEffect(() => {
    if (document.getElementById("forum-manga-assets")) return;
    const style = document.createElement("style");
    style.id = "forum-manga-assets";
    style.innerHTML = `
      .ink-box-forum {
        border: 4px solid #000;
        border-radius: 2px 255px 3px 255px / 255px 5px 225px 3px;
      }
      .halftone-forum-dark {
        background-image: radial-gradient(rgba(0,0,0,0.6) 1.5px, transparent 1.5px);
        background-size: 6px 6px;
      }
      .halftone-forum-light {
        background-image: radial-gradient(rgba(255,255,255,0.4) 1.5px, transparent 1.5px);
        background-size: 8px 8px;
      }
      .vertical-jp-forum {
        writing-mode: vertical-rl;
        text-orientation: upright;
        font-family: 'Noto Sans JP', sans-serif;
      }
      .jagged-tag-forum {
        clip-path: polygon(0% 15%, 8% 0%, 92% 0%, 100% 15%, 100% 85%, 92% 100%, 8% 100%, 0% 85%);
      }
      .speed-diag-forum {
        background-image: repeating-linear-gradient(115deg, transparent 0px, transparent 10px, rgba(0,0,0,0.04) 10px, rgba(0,0,0,0.04) 12px);
      }
      .no-scrollbar-forum::-webkit-scrollbar { display: none; }
      .no-scrollbar-forum { scrollbar-width: none; -ms-overflow-style: none; }
      @keyframes forum-shake {
        0% { transform: translate(1px, 1px) rotate(0deg); }
        20% { transform: translate(-2px, 0px) rotate(-1deg); }
        40% { transform: translate(2px, -1px) rotate(1deg); }
        60% { transform: translate(-1px, 1px) rotate(0deg); }
        80% { transform: translate(-1px, -1px) rotate(1deg); }
        100% { transform: translate(1px, -1px) rotate(-1deg); }
      }
      .group:hover .forum-shake { animation: forum-shake 0.3s cubic-bezier(.36,.07,.19,.97) both; }
    `;
    document.head.appendChild(style);
  }, []);
}

export default function Forum() {
  useForumMangaAssets();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCat = searchParams.get("category") ? parseInt(searchParams.get("category")!, 10) : undefined;
  const activeMediaType = searchParams.get("mediaType") || "";
  const search = searchParams.get("q") || "";
  const autoOpenNew = searchParams.get("new") === "1";

  const [categories, setCategories] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [showGatekeeper, setShowGatekeeper] = useState(false);
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);

  // X Social Interactions
  const [quotingThread, setQuotingThread] = useState<any | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [viewingUsername, setViewingUsername] = useState<string | null>(null);

  // AniList Media Linkage
  const [aniSearchQuery, setAniSearchQuery] = useState("");
  const [aniSearchType, setAniSearchType] = useState<"ANIME" | "MANGA">("ANIME");
  const [aniSearchResults, setAniSearchResults] = useState<VaultMedia[]>([]);
  const [aniSearching, setAniSearching] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<VaultMedia | null>(null);

  const [threadForm, setThreadForm] = useState({ categoryId: 1, title: "", content: "", imageUrl: "" });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const updateParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, thrds] = await Promise.all([
        fetchForumCategories(),
        fetchForumThreads({ categoryId: selectedCat, mediaType: activeMediaType, search }),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setThreads(thrds?.threads || []);
    } catch (err) {
      console.error("Forum fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const apiBase = import.meta.env.VITE_API_BASE_URL || "https://otaku-s-domain.onrender.com/api";
        try {
          const res = await fetch(`${apiBase}/auth/me`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            const profile = await res.json();
            setCurrentUser(profile);
            if (needsGenderDeclaration(profile)) {
              setShowGatekeeper(true);
            } else if (autoOpenNew) {
              setShowNewThreadModal(true);
            }
          }
          const notifs = await fetchNotifications();
          setNotifications(Array.isArray(notifs) ? notifs : []);
        } catch (err) {
          console.error("Failed to fetch user dossier:", err);
        }
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedCat, activeMediaType, search]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleCreateThreadClick = () => {
    if (!currentUser) {
      alert("Please authenticate to broadcast transmissions.");
      return;
    }
    if (needsGenderDeclaration(currentUser)) {
      setShowGatekeeper(true);
      return;
    }
    setQuotingThread(null);
    setShowNewThreadModal(true);
  };

  // In-Feed Like Action
  const handleLike = async (e: React.MouseEvent, threadId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) return alert("Please authenticate to like transmissions.");

    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? { ...t, hasLiked: !t.hasLiked, likesCount: t.hasLiked ? Math.max(0, t.likesCount - 1) : t.likesCount + 1 }
          : t
      )
    );
    await toggleThreadLike(threadId);
  };

  // In-Feed Instant Repost Action
  const handleRepost = async (e: React.MouseEvent, threadId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) return alert("Please authenticate to repost.");

    const res = await toggleRepost(threadId);
    if (res.success) {
      loadData();
    }
  };

  // Open Quote Modal
  const handleQuoteClick = (e: React.MouseEvent, targetThread: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) return alert("Please authenticate to quote transmissions.");

    setQuotingThread(targetThread);
    setThreadForm({
      categoryId: targetThread.category?.id || 1,
      title: `Quote: @${targetThread.author?.username}`,
      content: `@${targetThread.author?.username} `,
      imageUrl: "",
    });
    setShowNewThreadModal(true);
  };

  const handleOpenNotifications = async () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      await markNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  useEffect(() => {
    if (!aniSearchQuery.trim()) {
      setAniSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setAniSearching(true);
      try {
        const res = await fetchVaultMedia({
          page: 1,
          perPage: 6,
          type: aniSearchType,
          search: aniSearchQuery,
          isAdult: false,
        });
        setAniSearchResults(res.media);
      } catch (err) {
        console.error("AniList search failed:", err);
      } finally {
        setAniSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [aniSearchQuery, aniSearchType]);

  const handleImageSelect = async (file: File) => {
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);
    setUploadingImage(true);
    try {
      const url = await uploadMediaAsset(file);
      setThreadForm((prev) => ({ ...prev, imageUrl: url }));
    } catch {
      setImagePreview(null);
      alert("Artwork upload failed.");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setThreadForm((prev) => ({ ...prev, imageUrl: "" }));
    setImagePreview(null);
  };

  const handlePublishThread = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...threadForm,
        mediaId: selectedMedia ? Number(selectedMedia.id) : undefined,
        mediaType: selectedMedia ? (selectedMedia.format.toUpperCase().includes("MANGA") ? "MANGA" : "ANIME") : undefined,
        mediaTitle: selectedMedia ? selectedMedia.title : undefined,
        mediaCoverUrl: selectedMedia ? selectedMedia.image : undefined,
        mediaScore: selectedMedia?.score || undefined,
        repostOfThreadId: quotingThread ? quotingThread.id : undefined,
        isQuoteRepost: Boolean(quotingThread),
      };

      const res = await createForumThread(payload);
      if (res.requiresGender) {
        setShowNewThreadModal(false);
        setShowGatekeeper(true);
        return;
      }
      if (res.success) {
        setShowNewThreadModal(false);
        setSelectedMedia(null);
        setQuotingThread(null);
        setThreadForm({ categoryId: 1, title: "", content: "", imageUrl: "" });
        setImagePreview(null);
        updateParam("new", "");
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const closeNewThreadModal = () => {
    setShowNewThreadModal(false);
    setQuotingThread(null);
    updateParam("new", "");
  };

  const factionBg = (faction: string) =>
    faction === "Blue" ? "bg-[#1a4a9c]" : faction === "Red" ? "bg-[#b01e33]" : "bg-purple-600";

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[#e8e4d8] pt-20 md:pt-24 pb-24 px-3 sm:px-4 md:px-8 text-black relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.15] halftone-forum-dark pointer-events-none" />

      <div className="max-w-[100rem] mx-auto relative z-10">
        {/* HEADER BAR */}
        <div className="ink-box-forum bg-white p-4 sm:p-6 md:p-10 shadow-[8px_8px_0px_#000] md:shadow-[12px_12px_0px_#000] mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          <div className="absolute inset-0 speed-diag-forum pointer-events-none" />
          <div className="hidden sm:block absolute -right-4 -bottom-10 vertical-jp-forum text-black/5 font-black text-[8rem] tracking-widest pointer-events-none select-none leading-none">
            通信
          </div>

          <div className="relative z-10">
            <span className="inline-block bg-black text-white text-[9px] sm:text-[10px] font-bold uppercase px-3 py-1 jagged-tag-forum rotate-[-1deg] mb-3 shadow-[3px_3px_0px_var(--guild-primary)]" style={{ fontFamily: F_MONO }}>
              Operative Frequency // Global Stream
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-7xl uppercase tracking-tighter leading-[0.9]" style={{ fontFamily: F_DISPLAY }}>
              Otaku's <span style={{ WebkitTextStroke: "2px black", color: "white", textShadow: "4px 4px 0px #000" }}>Domain</span> Terminal
            </h1>
          </div>

          <div className="relative z-10 flex items-center gap-3 w-full md:w-auto">
            {currentUser && (
              <button
                onClick={handleOpenNotifications}
                className="relative bg-white border-2 border-black px-4 py-3.5 ink-box-forum font-mono font-bold text-xs uppercase hover:bg-yellow-400 transition-colors flex items-center gap-2 cursor-pointer shadow-[4px_4px_0px_#000]"
              >
                <span>🔔 Alerts</span>
                {unreadCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={handleCreateThreadClick}
              className="flex-1 md:flex-none bg-black text-white uppercase text-sm font-black px-6 py-3.5 md:py-4 ink-box-forum border-2 border-black hover:bg-[var(--guild-primary)] hover:text-black transition-all shadow-[5px_5px_0px_var(--guild-primary)] hover:shadow-[7px_7px_0px_#000] active:translate-y-1 active:shadow-none shrink-0 text-center cursor-pointer"
              style={{ fontFamily: F_DISPLAY }}
            >
              + Transmit (+5 QP)
            </button>
          </div>
        </div>

        {/* NOTIFICATIONS DRAWER */}
        {showNotifications && (
          <div className="ink-box-forum bg-white p-4 mb-6 shadow-[8px_8px_0px_#000] max-h-72 overflow-y-auto font-mono text-xs">
            <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-3">
              <span className="font-black uppercase">Operative Radar Feed</span>
              <button onClick={() => setShowNotifications(false)} className="font-bold text-red-600">✕ Close</button>
            </div>
            {notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.map((n: any) => (
                  <div key={n.id} className="p-2.5 border border-black/20 bg-[#e8e4d8] flex items-center justify-between">
                    <div>
                      <span className="font-black uppercase mr-2">[{n.type}]</span>
                      <span>{n.message}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">{new Date(n.createdAt).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-zinc-500 py-4 text-center">No alerts logged in your frequency.</div>
            )}
          </div>
        )}

        {/* FILTERS & CHANNEL SELECTOR */}
        <div className="flex flex-col gap-4 mb-6 md:mb-8 ink-box-forum bg-white p-4 sm:p-5 shadow-[6px_6px_0px_#000] relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-3 pb-3 border-b-2 border-black/10 border-dashed">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase text-zinc-500 mr-1 shrink-0" style={{ fontFamily: F_MONO }}>Filter:</span>
              {[
                { key: "", label: "All" },
                { key: "ANIME", label: "📺 Anime" },
                { key: "MANGA", label: "📖 Manga" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => updateParam("mediaType", opt.key)}
                  className={`px-3 py-1.5 text-xs font-black uppercase jagged-tag-forum border-2 border-black transition-all cursor-pointer ${
                    activeMediaType === opt.key ? "bg-black text-white shadow-[2px_2px_0px_var(--guild-primary)]" : "bg-[#e8e4d8] text-black hover:bg-zinc-200"
                  }`}
                  style={{ fontFamily: F_MONO }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search transmissions or @operatives..."
              value={search}
              onChange={(e) => updateParam("q", e.target.value)}
              className="bg-[#e8e4d8] border-2 border-black px-3 py-2.5 sm:py-2 font-bold text-xs uppercase w-full sm:w-72 sm:ml-auto focus:outline-none focus:shadow-[3px_3px_0px_var(--guild-primary)] transition-all"
              style={{ fontFamily: F_MONO }}
            />
          </div>

          <div className="relative z-10 flex gap-2 pt-1 overflow-x-auto no-scrollbar-forum -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap">
            <button
              onClick={() => updateParam("category", "")}
              className={`shrink-0 px-3 py-1.5 uppercase font-black text-xs jagged-tag-forum border-2 border-black transition-all cursor-pointer ${
                !selectedCat ? "bg-black text-white shadow-[2px_2px_0px_#000]" : "bg-[#e8e4d8] text-black hover:bg-zinc-200"
              }`}
              style={{ fontFamily: F_MONO }}
            >
              All Channels
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => updateParam("category", cat.id.toString())}
                className={`shrink-0 px-3 py-1.5 uppercase font-black text-xs jagged-tag-forum border-2 border-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedCat === cat.id ? "bg-black text-white shadow-[2px_2px_0px_#000]" : "bg-[#e8e4d8] text-black hover:bg-zinc-200"
                }`}
                style={{ fontFamily: F_MONO }}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-60">({cat.threadCount})</span>
              </button>
            ))}
          </div>
        </div>

        {/* THREAD FEED */}
        <div className="grid grid-cols-1 gap-4 md:gap-5">
          {loading ? (
            <div className="ink-box-forum bg-white py-16 text-center font-bold uppercase text-zinc-500 shadow-[6px_6px_0px_#000] relative overflow-hidden" style={{ fontFamily: F_MONO }}>
              <span className="relative z-10 animate-pulse">⚡ Intercepting Guild Frequencies...</span>
            </div>
          ) : threads.length > 0 ? (
            threads.map((t) => (
              <div
                key={t.id}
                className="relative ink-box-forum bg-white p-5 shadow-[6px_6px_0px_#000] flex flex-col gap-3 overflow-hidden"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-2 ${factionBg(t.author?.faction)}`} />

                {/* Author Info & Badges (Clicking user opens dossier) */}
                <div className="flex items-center justify-between pl-2">
                  <div
                    onClick={() => setViewingUsername(t.author?.username)}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <img
                      src={t.author?.avatarUrl || "https://via.placeholder.com/60"}
                      alt={t.author?.displayName}
                      className="w-10 h-10 border-2 border-black object-cover shrink-0 bg-zinc-900 group-hover:scale-105 transition-transform"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm uppercase group-hover:text-red-600 transition-colors" style={{ fontFamily: F_MONO }}>
                          {t.author?.displayName}
                        </span>
                        <span className="text-xs font-mono text-zinc-500">@{t.author?.username}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="bg-black text-white px-1.5 py-0.2 text-[8px] font-black uppercase font-mono">
                          {t.category?.icon} {t.category?.name}
                        </span>
                        <span className="bg-yellow-400 text-black px-1.5 py-0.2 text-[8px] font-black uppercase border border-black font-mono">
                          {t.author?.gender}
                        </span>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 border border-black text-white font-mono ${factionBg(t.author?.faction)}`}>
                          {t.author?.faction}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold text-zinc-400">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Content Link */}
                <Link to={`/forum/${t.id}`} className="block pl-2">
                  <h3 className="text-xl sm:text-2xl uppercase font-black text-black hover:text-[var(--guild-primary)] transition-colors leading-tight mb-1" style={{ fontFamily: F_DISPLAY }}>
                    {t.title}
                  </h3>
                  <p className="text-xs font-mono text-zinc-700 whitespace-pre-line line-clamp-3 leading-relaxed">
                    {t.content}
                  </p>
                </Link>

                {/* Attached Artwork */}
                {t.imageUrl && (
                  <div className="pl-2 max-w-md">
                    <div className="border-2 border-black overflow-hidden bg-black max-h-72 flex items-center justify-center">
                      <img src={t.imageUrl} alt="Attached artwork" className="w-full h-auto object-cover" loading="lazy" />
                    </div>
                  </div>
                )}

                {/* Attached Quoted Thread */}
                {t.repostOfThread && (
                  <div className="ml-2 border-2 border-black p-3 bg-[#e8e4d8] font-mono text-xs shadow-[3px_3px_0px_#000]">
                    <span className="font-bold text-[10px] text-zinc-500 uppercase block mb-1">
                      Quoting @{t.repostOfThread.author?.username}:
                    </span>
                    <h4 className="font-black text-sm uppercase" style={{ fontFamily: F_DISPLAY }}>
                      {t.repostOfThread.title}
                    </h4>
                    <p className="text-zinc-700 line-clamp-2 mt-1">{t.repostOfThread.content}</p>
                  </div>
                )}

                {/* Social Interaction Buttons */}
                <div className="flex items-center gap-6 pt-3 border-t border-black/10 font-mono text-xs font-bold pl-2">
                  <Link to={`/forum/${t.id}`} className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                    💬 {t.replyCount || 0}
                  </Link>

                  <button
                    onClick={(e) => handleRepost(e, t.id)}
                    className="flex items-center gap-1.5 hover:text-green-600 transition-colors cursor-pointer"
                  >
                    🔁 {t.repostCount || 0}
                  </button>

                  <button
                    onClick={(e) => handleQuoteClick(e, t)}
                    className="flex items-center gap-1.5 hover:text-purple-600 transition-colors cursor-pointer"
                  >
                    🖋️ Quote
                  </button>

                  <button
                    onClick={(e) => handleLike(e, t.id)}
                    className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                      t.hasLiked ? "text-red-600 font-black" : "hover:text-red-600"
                    }`}
                  >
                    {t.hasLiked ? "❤️" : "🤍"} {t.likesCount || 0}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="ink-box-forum py-16 text-center font-bold uppercase text-zinc-500 bg-white shadow-[6px_6px_0px_#000]" style={{ fontFamily: F_MONO }}>
              No transmissions logged in this channel yet.
            </div>
          )}
        </div>
      </div>

      <ForumFloatingDock onNewTransmission={handleCreateThreadClick} />

      {/* OPERATIVE PROFILE MODAL */}
      {viewingUsername && (
        <OperativeProfileModal
          username={viewingUsername}
          onClose={() => setViewingUsername(null)}
        />
      )}

      {/* GENDER GATEKEEPER MODAL */}
      {showGatekeeper && (
        <GenderGatekeeperModal
          onSuccess={(gender) => {
            setCurrentUser((prev: any) => (prev ? { ...prev, gender } : { gender }));
            setShowGatekeeper(false);
            if (autoOpenNew) setShowNewThreadModal(true);
          }}
          onCancel={() => setShowGatekeeper(false)}
        />
      )}

      {/* BROADCAST / QUOTE MODAL */}
      {showNewThreadModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="ink-box-forum bg-[#e8e4d8] p-5 sm:p-6 md:p-8 max-w-2xl w-full shadow-[14px_14px_0px_#000] relative max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-none">
            <div className="relative z-10 flex justify-between items-center mb-4 pb-3 border-b-2 border-black sticky -top-5 sm:top-0 bg-[#e8e4d8] pt-1 sm:pt-0">
              <h2 className="text-2xl sm:text-3xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
                {quotingThread ? `Quote @${quotingThread.author?.username}` : "Broadcast Transmission"}
              </h2>
              <button onClick={closeNewThreadModal} className="font-bold text-xs bg-black text-white px-3 py-1.5 jagged-tag-forum shrink-0 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handlePublishThread} className="relative z-10 flex flex-col gap-3" style={{ fontFamily: F_MONO }}>
              <div>
                <label className="text-xs font-bold uppercase block mb-1">Target Channel</label>
                <select
                  value={threadForm.categoryId}
                  onChange={(e) => setThreadForm({ ...threadForm, categoryId: parseInt(e.target.value, 10) })}
                  className="w-full p-2.5 border-2 border-black text-xs font-bold bg-white uppercase"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              {/* AniList Search for Normal Threads */}
              {!quotingThread && (
                <div className="border-2 border-black p-3 bg-white">
                  <span className="text-xs font-black uppercase block mb-1 text-zinc-700">Link Anime or Manga Dossier (AniList)</span>
                  {selectedMedia ? (
                    <div className="flex items-center justify-between bg-[#e8e4d8] border border-black p-2 gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={selectedMedia.image} alt={selectedMedia.title} className="w-10 h-14 object-cover border border-black shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[9px] font-black uppercase bg-black text-white px-1.5 py-0.5">{selectedMedia.format}</span>
                          <h4 className="text-sm font-black uppercase line-clamp-1">{selectedMedia.title}</h4>
                        </div>
                      </div>
                      <button type="button" onClick={() => setSelectedMedia(null)} className="text-xs font-bold text-red-600 hover:text-black uppercase px-2 shrink-0 cursor-pointer">
                        Remove ✕
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-2 mb-2">
                        <button type="button" onClick={() => setAniSearchType("ANIME")} className={`px-3 py-1 text-xs font-bold uppercase border border-black cursor-pointer ${aniSearchType === "ANIME" ? "bg-black text-white" : "bg-[#e8e4d8]"}`}>Anime</button>
                        <button type="button" onClick={() => setAniSearchType("MANGA")} className={`px-3 py-1 text-xs font-bold uppercase border border-black cursor-pointer ${aniSearchType === "MANGA" ? "bg-black text-white" : "bg-[#e8e4d8]"}`}>Manga</button>
                      </div>
                      <input
                        type="text"
                        placeholder={`Search ${aniSearchType} title on AniList...`}
                        value={aniSearchQuery}
                        onChange={(e) => setAniSearchQuery(e.target.value)}
                        className="w-full p-2 border border-zinc-300 text-xs font-bold bg-zinc-50"
                      />
                      {aniSearching && <div className="text-[10px] uppercase font-bold text-zinc-500 mt-1">Searching AniList database...</div>}
                      {aniSearchResults.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto border-t border-black/10 pt-2">
                          {aniSearchResults.map((media) => (
                            <div
                              key={media.id}
                              onClick={() => { setSelectedMedia(media); setAniSearchQuery(""); setAniSearchResults([]); }}
                              className="flex items-center gap-2 p-1.5 bg-[#e8e4d8] border border-black cursor-pointer hover:bg-black hover:text-white transition-colors"
                            >
                              <img src={media.image} alt={media.title} className="w-8 h-10 object-cover border border-black shrink-0" />
                              <span className="text-[10px] font-black uppercase truncate">{media.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-bold uppercase block mb-1">Transmission Title</label>
                <input
                  type="text"
                  placeholder="e.g. Bleach TYBW Episode 4 Analysis..."
                  value={threadForm.title}
                  onChange={(e) => setThreadForm({ ...threadForm, title: e.target.value })}
                  className="w-full p-2.5 border-2 border-black text-xs font-bold bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase block mb-1">
                  Message Content (Tag operatives using @username)
                </label>
                <textarea
                  placeholder="Draft your message, theory or discussion prompt..."
                  value={threadForm.content}
                  onChange={(e) => setThreadForm({ ...threadForm, content: e.target.value })}
                  className="w-full p-3 border-2 border-black text-xs font-bold bg-white h-28 sm:h-32 resize-none"
                  required
                />
              </div>

              {/* Artwork Upload */}
              <div>
                <label className="text-xs font-bold uppercase block mb-1">Attach Artwork (Optional)</label>
                {imagePreview ? (
                  <div className="relative border-2 border-black overflow-hidden bg-zinc-900 group">
                    <img
                      src={imagePreview}
                      alt="Artwork preview"
                      className={`w-full max-h-64 object-cover transition-opacity ${uploadingImage ? "opacity-50" : "opacity-100"}`}
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/80 text-white border-2 border-white flex items-center justify-center text-sm font-black hover:bg-red-600 transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer bg-black text-white px-4 py-2.5 text-xs font-black uppercase inline-block border border-black hover:bg-[var(--guild-primary)] hover:text-black transition-colors w-full sm:w-auto text-center">
                    📁 Upload Artwork
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageSelect(f);
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <button
                type="submit"
                disabled={uploadingImage}
                className="bg-black text-white p-3.5 font-black uppercase text-sm ink-box-forum border-2 border-black hover:bg-[var(--guild-primary)] hover:text-black transition-colors mt-3 shadow-[4px_4px_0px_var(--guild-primary)] sticky bottom-0 cursor-pointer disabled:opacity-40"
                style={{ fontFamily: F_DISPLAY }}
              >
                {uploadingImage ? "Uploading Artwork..." : "Transmit to Guild (+5 QP) ➔"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}