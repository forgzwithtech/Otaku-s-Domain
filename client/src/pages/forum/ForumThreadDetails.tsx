// src/pages/forum/ForumThreadDetail.tsx
import { useState, useEffect, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchThreadDetails, postThreadComment } from "../../services/forumApi";
import GenderGatekeeperModal from "../../components/forum/GenderGatekeeperModal";
import { supabase } from "../../lib/supabase";
import { needsGenderDeclaration } from "../../utils/genter";

const F_DISPLAY = "'Anton', sans-serif";
const F_SFX = "'Bangers', cursive";
const F_MONO = "'Space Mono', monospace";

function useThreadMangaAssets() {
  useEffect(() => {
    if (document.getElementById("thread-manga-assets")) return;
    const style = document.createElement("style");
    style.id = "thread-manga-assets";
    style.innerHTML = `
      .ink-box-thread {
        border: 4px solid #000;
        border-radius: 2px 255px 3px 255px / 255px 5px 225px 3px;
      }
      .halftone-thread-dark {
        background-image: radial-gradient(rgba(0,0,0,0.6) 1.5px, transparent 1.5px);
        background-size: 6px 6px;
      }
      .vertical-jp-thread {
        writing-mode: vertical-rl;
        text-orientation: upright;
        font-family: 'Noto Sans JP', sans-serif;
      }
      .jagged-tag-thread {
        clip-path: polygon(0% 15%, 8% 0%, 92% 0%, 100% 15%, 100% 85%, 92% 100%, 8% 100%, 0% 85%);
      }
    `;
    document.head.appendChild(style);
  }, []);
}

export default function ForumThreadDetail() {
  useThreadMangaAssets();
  const { id } = useParams<{ id: string }>();
  const [thread, setThread] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [showGatekeeper, setShowGatekeeper] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [qpToast, setQpToast] = useState<string | null>(null);

  const loadThread = async () => {
    if (!id) return;
    try {
      const data = await fetchThreadDetails(parseInt(id, 10));
      setThread(data);
    } catch (err) {
      console.error("Failed to load thread:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5101/api";
        const res = await fetch(`${apiBase}/auth/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const profile = await res.json();
          setCurrentUser(profile);
          if (needsGenderDeclaration(profile)) {
            setShowGatekeeper(true);
          }
        }
      }
    }
    checkAuth();
    loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handlePostComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Please authenticate to reply.");
      return;
    }
    if (needsGenderDeclaration(currentUser)) {
      setShowGatekeeper(true);
      return;
    }
    if (!commentText.trim() || !id) return;

    setSubmittingComment(true);
    try {
      const res = await postThreadComment(parseInt(id, 10), commentText);
      if (res.requiresGender) {
        setShowGatekeeper(true);
        return;
      }
      if (res.success) {
        setCommentText("");
        if (res.qpAwarded) {
          setQpToast(`+${res.qpAwarded} QP (Transmission Sent)`);
          setTimeout(() => setQpToast(null), 4000);
        }
        loadThread();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const factionBg = (faction: string) =>
    faction === "Blue" ? "bg-[#1a4a9c]" : faction === "Red" ? "bg-[#b01e33]" : "bg-zinc-400";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e8e4d8] pt-36 text-center font-bold text-black uppercase animate-pulse" style={{ fontFamily: F_MONO }}>
        ⚡ Decrypting Transmission Stream...
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen bg-[#e8e4d8] pt-36 text-center font-bold text-black uppercase" style={{ fontFamily: F_MONO }}>
        Transmission Not Found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e8e4d8] pt-24 pb-20 px-4 md:px-8 text-black relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.12] halftone-thread-dark pointer-events-none" />

      {qpToast && (
        <div
          className="fixed top-20 right-6 z-50 bg-black text-yellow-400 border-4 border-yellow-400 p-4 font-black uppercase text-sm shadow-[8px_8px_0px_#000] animate-bounce ink-box-thread"
          style={{ fontFamily: F_MONO }}
        >
          🏆 {qpToast}
        </div>
      )}

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-6 flex justify-between items-center">
          <Link
            to="/forum"
            className="bg-black text-white px-5 py-2.5 uppercase font-black text-xs jagged-tag-thread border-2 border-black hover:bg-[var(--guild-primary)] hover:text-black transition-colors"
            style={{ fontFamily: F_MONO }}
          >
            ← Return to Forum Frequencies
          </Link>
          <span className="text-xs font-bold uppercase text-zinc-600" style={{ fontFamily: F_MONO }}>
            Channel: {thread.category.icon} {thread.category.name}
          </span>
        </div>

        {/* MAIN THREAD */}
        <div className="ink-box-thread bg-white p-6 md:p-10 shadow-[12px_12px_0px_#000] mb-8 relative overflow-hidden">
          <div className={`absolute left-0 top-0 bottom-0 w-2 ${factionBg(thread.author.faction)}`} />
          <div className="absolute -right-6 -bottom-12 vertical-jp-thread text-black/5 font-black text-[9rem] tracking-widest pointer-events-none select-none leading-none">
            記録
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-2 mb-4 pb-3 border-b-2 border-black/10 border-dashed">
            <span className="bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase jagged-tag-thread" style={{ fontFamily: F_MONO }}>
              {thread.category.name}
            </span>
            {thread.isPinned && (
              <span className="bg-red-600 text-white px-2 py-0.5 text-[10px] font-black uppercase jagged-tag-thread" style={{ fontFamily: F_MONO }}>
                📌 PINNED
              </span>
            )}
            {thread.isLocked && (
              <span className="bg-zinc-800 text-white px-2 py-0.5 text-[10px] font-black uppercase jagged-tag-thread" style={{ fontFamily: F_MONO }}>
                🔒 LOCKED
              </span>
            )}
          </div>

          <h1 className="relative z-10 text-3xl md:text-5xl uppercase font-black tracking-tighter text-black mb-6" style={{ fontFamily: F_DISPLAY }}>
            {thread.title}
          </h1>

          {thread.mediaTitle && (
            <div className="relative z-10 ink-box-thread bg-[#e8e4d8] p-4 mb-6 flex flex-col sm:flex-row items-center gap-4 shadow-[6px_6px_0px_#000]">
              <img
                src={thread.mediaCoverUrl || "https://via.placeholder.com/150"}
                alt={thread.mediaTitle}
                className="w-20 h-28 object-cover border-2 border-black shrink-0 bg-zinc-900"
              />
              <div className="flex-1">
                <span className="bg-blue-600 text-white px-2 py-0.5 text-[9px] font-black uppercase jagged-tag-thread" style={{ fontFamily: F_MONO }}>
                  {thread.mediaType} // ANILIST DOSSIER
                </span>
                <h3 className="text-2xl uppercase font-black text-black mt-1" style={{ fontFamily: F_DISPLAY }}>
                  {thread.mediaTitle}
                </h3>
                {thread.mediaScore && (
                  <span className="text-xs font-bold text-yellow-600 block mt-1" style={{ fontFamily: F_MONO }}>
                    Community Rating: ★ {thread.mediaScore}%
                  </span>
                )}
              </div>
              {thread.mediaId && (
                <Link
                  to={`/vault/${thread.mediaId}`}
                  className="bg-black text-white px-4 py-2 text-xs font-black uppercase jagged-tag-thread border-2 border-black hover:bg-[var(--guild-primary)] hover:text-black transition-colors"
                  style={{ fontFamily: F_DISPLAY }}
                >
                  View in Vault ↗
                </Link>
              )}
            </div>
          )}

          <div className="relative z-10 flex items-center gap-4 bg-[#e8e4d8] ink-box-thread p-3 mb-6">
            <img
              src={thread.author.avatarUrl || "https://via.placeholder.com/60"}
              alt={thread.author.displayName}
              className="w-12 h-12 border-2 border-black object-cover shrink-0 bg-zinc-900 skew-x-[-6deg]"
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-black text-sm uppercase text-black" style={{ fontFamily: F_DISPLAY }}>
                {thread.author.displayName}
              </span>
              <span className="bg-yellow-400 text-black px-1.5 py-0.5 text-[9px] font-black uppercase border border-black jagged-tag-thread" style={{ fontFamily: F_MONO }}>
                {thread.author.gender}
              </span>
              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 border border-black jagged-tag-thread text-white ${factionBg(thread.author.faction)}`} style={{ fontFamily: F_MONO }}>
                {thread.author.faction}
              </span>
              <span className="text-yellow-600 font-bold text-xs" style={{ fontFamily: F_MONO }}>
                ★ {thread.author.questPoints} QP
              </span>
              <span className="text-zinc-500 text-[10px] ml-auto" style={{ fontFamily: F_MONO }}>
                {new Date(thread.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          <p className="relative z-10 text-sm md:text-base leading-relaxed text-zinc-900 font-medium whitespace-pre-line mb-6" style={{ fontFamily: F_MONO }}>
            {thread.content}
          </p>

          {thread.imageUrl && (
            <div className="relative z-10 ink-box-thread overflow-hidden shadow-[8px_8px_0px_#000] mb-6 max-h-[500px] flex items-center justify-center bg-black">
              <img src={thread.imageUrl} alt="Attached Artwork" className="w-full h-auto object-contain" />
            </div>
          )}

          <div className="relative z-10 flex justify-between items-center pt-4 border-t-2 border-black/10 border-dashed text-xs font-bold text-zinc-600" style={{ fontFamily: F_MONO }}>
            <span>👁 {thread.viewCount} Total Views</span>
            <span>💬 {thread.comments?.length || 0} Replies Logged</span>
          </div>
        </div>

        {/* COMMENT STREAM */}
        <div className="mb-8">
          <h2 className="text-2xl uppercase font-black mb-4 flex items-center gap-2" style={{ fontFamily: F_DISPLAY }}>
            <span>Transmission Log</span>
            <span className="text-sm font-bold text-zinc-500" style={{ fontFamily: F_MONO }}>({thread.comments?.length || 0})</span>
          </h2>

          <div className="flex flex-col gap-4">
            {thread.comments?.length > 0 ? (
              thread.comments.map((comment: any) => (
                <div key={comment.id} className="ink-box-thread bg-white p-4 shadow-[5px_5px_0px_#000] flex gap-4 relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${factionBg(comment.author.faction)}`} />
                  <img
                    src={comment.author.avatarUrl || "https://via.placeholder.com/50"}
                    alt={comment.author.displayName}
                    className="w-10 h-10 border-2 border-black object-cover shrink-0 bg-zinc-900 skew-x-[-6deg] ml-1"
                  />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-black text-xs uppercase" style={{ fontFamily: F_DISPLAY }}>
                        {comment.author.displayName}
                      </span>
                      <span className="bg-yellow-400 text-black px-1.5 py-0.5 text-[8px] font-black uppercase border border-black jagged-tag-thread" style={{ fontFamily: F_MONO }}>
                        {comment.author.gender}
                      </span>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 border border-black jagged-tag-thread text-white ${factionBg(comment.author.faction)}`} style={{ fontFamily: F_MONO }}>
                        {comment.author.faction}
                      </span>
                      <span className="text-zinc-400 text-[10px] ml-auto" style={{ fontFamily: F_MONO }}>
                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <p className="text-xs md:text-sm text-zinc-800 font-medium whitespace-pre-line leading-relaxed" style={{ fontFamily: F_MONO }}>
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="border-2 border-dashed border-black/40 p-8 text-center text-xs font-bold text-zinc-500 uppercase" style={{ fontFamily: F_MONO }}>
                No transmission replies yet. Be the first operative to respond.
              </div>
            )}
          </div>
        </div>

        {/* REPLY FORM */}
        {!thread.isLocked ? (
          <form onSubmit={handlePostComment} className="ink-box-thread bg-white p-6 shadow-[8px_8px_0px_#000] relative overflow-hidden">
            <div
              className="hidden md:block absolute top-4 right-6 select-none pointer-events-none rotate-[6deg] z-10"
              style={{ fontFamily: F_SFX, color: "var(--guild-primary)", WebkitTextStroke: "1.5px black", fontSize: "1.6rem" }}
            >
              SPEAK UP!
            </div>
            <h3 className="text-xl uppercase font-black mb-3" style={{ fontFamily: F_DISPLAY }}>
              Transmit Reply (+2 QP)
            </h3>
            <textarea
              placeholder={currentUser ? "Draft your transmission..." : "Authenticate your operative profile to post..."}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={!currentUser || submittingComment}
              className="w-full p-3 border-2 border-black text-xs font-bold bg-[#e8e4d8] h-28 resize-none focus:outline-none focus:bg-white focus:shadow-[3px_3px_0px_var(--guild-primary)] transition-all mb-3"
              style={{ fontFamily: F_MONO }}
              required
            />
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold text-zinc-500" style={{ fontFamily: F_MONO }}>
                Identity Badge: {currentUser ? `${currentUser.gender || "Unspecified"} Operative` : "Guest"}
              </span>
              <button
                type="submit"
                disabled={!currentUser || submittingComment || !commentText.trim()}
                className="bg-black text-white px-6 py-3 font-black uppercase text-xs jagged-tag-thread border-2 border-black hover:bg-[var(--guild-primary)] hover:text-black transition-colors disabled:opacity-40"
                style={{ fontFamily: F_DISPLAY }}
              >
                {submittingComment ? "Transmitting..." : "Send Transmission ➔"}
              </button>
            </div>
          </form>
        ) : (
          <div className="ink-box-thread bg-zinc-900 text-white p-4 text-center font-bold text-xs uppercase" style={{ fontFamily: F_MONO }}>
            🔒 This transmission has been sealed by Interpool Command.
          </div>
        )}
      </div>

      {showGatekeeper && (
        <GenderGatekeeperModal
          onSuccess={(gender) => {
            setCurrentUser((prev: any) => ({ ...prev, gender }));
            setShowGatekeeper(false);
          }}
          onCancel={() => setShowGatekeeper(false)}
        />
      )}
    </div>
  );
}