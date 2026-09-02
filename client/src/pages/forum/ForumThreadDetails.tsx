// src/pages/forum/ForumThreadDetail.tsx
import { useState, useEffect, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  fetchThreadDetails, 
  postThreadComment, 
  toggleCommentLike, 
  toggleThreadLike, 
  toggleRepost 
} from "../../services/forumApi";
import GenderGatekeeperModal from "../../components/forum/GenderGatekeeperModal";
import OperativeProfileModal from "../../components/forum/OperativeProfileModal";
import { supabase } from "../../lib/supabase";
import { needsGenderDeclaration } from "../../utils/genter";

const F_DISPLAY = "'Anton', sans-serif";
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
  const [viewingUsername, setViewingUsername] = useState<string | null>(null);

  // Comment & Nested Reply State
  const [commentText, setCommentText] = useState("");
  const [replyingToComment, setReplyingToComment] = useState<{ id: number; username: string } | null>(null);
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
        const apiBase = import.meta.env.VITE_API_BASE_URL || "https://otaku-s-domain.onrender.com/api";
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
      const res = await postThreadComment(
        parseInt(id, 10),
        commentText.trim(),
        replyingToComment ? replyingToComment.id : undefined
      );

      if (res.requiresGender) {
        setShowGatekeeper(true);
        return;
      }

      if (res.success) {
        setCommentText("");
        setReplyingToComment(null);
        if (res.qpAwarded) {
          setQpToast(`+${res.qpAwarded} QP (Transmission Logged)`);
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

  const handleLikeThread = async () => {
    if (!currentUser) return alert("Please authenticate to endorse transmissions.");
    if (!thread) return;

    setThread((prev: any) => ({
      ...prev,
      hasLiked: !prev.hasLiked,
      likesCount: prev.hasLiked ? Math.max(0, prev.likesCount - 1) : prev.likesCount + 1,
    }));

    await toggleThreadLike(thread.id || thread.Id);
  };

  const handleLikeComment = async (commentId: number) => {
    if (!currentUser) return alert("Please authenticate to like responses.");

    setThread((prev: any) => {
      if (!prev || !prev.comments) return prev;
      return {
        ...prev,
        comments: prev.comments.map((c: any) =>
          c.id === commentId
            ? {
                ...c,
                hasLiked: !c.hasLiked,
                likesCount: c.hasLiked ? Math.max(0, c.likesCount - 1) : c.likesCount + 1,
              }
            : c
        ),
      };
    });

    await toggleCommentLike(commentId);
  };

  const handleRepostThread = async () => {
    if (!currentUser) return alert("Please authenticate to repost.");
    if (!thread) return;

    const res = await toggleRepost(thread.id || thread.Id);
    if (res.success) {
      setQpToast(res.message);
      setTimeout(() => setQpToast(null), 4000);
      loadThread();
    }
  };

  const factionBg = (faction: string) =>
    faction === "Blue" ? "bg-[#1a4a9c]" : faction === "Red" ? "bg-[#b01e33]" : "bg-purple-600";

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

  const threadAuthor = thread.author || thread.Author;
  const threadComments = thread.comments || thread.Comments || [];
  const topLevelComments = threadComments.filter((c: any) => !c.parentCommentId && !c.ParentCommentId);
  const getRepliesFor = (parentId: number) =>
    threadComments.filter((c: any) => (c.parentCommentId || c.ParentCommentId) === parentId);

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

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="mb-6 flex justify-between items-center">
          <Link
            to="/forum"
            className="bg-black text-white px-5 py-2.5 uppercase font-black text-xs jagged-tag-thread border-2 border-black hover:bg-[var(--guild-primary)] hover:text-black transition-colors"
            style={{ fontFamily: F_MONO }}
          >
            ← Return to Forum Frequencies
          </Link>
          <span className="text-xs font-bold uppercase text-zinc-600 font-mono">
            Channel: {thread.category?.icon} {thread.category?.name}
          </span>
        </div>

        {/* MAIN THREAD TRANSMISSION CARD */}
        <div className="ink-box-thread bg-white p-6 md:p-8 shadow-[12px_12px_0px_#000] mb-8 relative overflow-hidden">
          <div className={`absolute left-0 top-0 bottom-0 w-2.5 ${factionBg(threadAuthor?.faction)}`} />
          <div className="absolute -right-6 -bottom-12 vertical-jp-thread text-black/5 font-black text-[9rem] tracking-widest pointer-events-none select-none leading-none">
            記録
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-2 mb-4 pb-3 border-b-2 border-black/10 border-dashed">
            <span className="bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase jagged-tag-thread font-mono">
              {thread.category?.name}
            </span>
            {thread.isPinned && (
              <span className="bg-red-600 text-white px-2 py-0.5 text-[10px] font-black uppercase jagged-tag-thread font-mono">
                📌 PINNED
              </span>
            )}
            {thread.isLocked && (
              <span className="bg-zinc-800 text-white px-2 py-0.5 text-[10px] font-black uppercase jagged-tag-thread font-mono">
                🔒 LOCKED
              </span>
            )}
          </div>

          {/* Author Capsule */}
          <div className="relative z-10 flex items-center justify-between bg-[#e8e4d8] ink-box-thread p-3 mb-6">
            <div
              onClick={() => setViewingUsername(threadAuthor?.username || threadAuthor?.Username)}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <img
                src={threadAuthor?.avatarUrl || threadAuthor?.AvatarUrl || "https://via.placeholder.com/60"}
                alt={threadAuthor?.displayName}
                className="w-12 h-12 border-2 border-black object-cover shrink-0 bg-zinc-900 group-hover:scale-105 transition-transform"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm uppercase text-black group-hover:text-[var(--guild-primary)] transition-colors" style={{ fontFamily: F_DISPLAY }}>
                    {threadAuthor?.displayName || threadAuthor?.DisplayName}
                  </span>
                  <span className="text-xs font-mono text-zinc-500 font-bold">
                    @{threadAuthor?.username || threadAuthor?.Username}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="bg-yellow-400 text-black px-1 py-0.2 text-[9px] font-black uppercase border border-black jagged-tag-thread font-mono">
                    {threadAuthor?.gender || threadAuthor?.Gender}
                  </span>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 border border-black jagged-tag-thread text-white font-mono ${factionBg(threadAuthor?.faction)}`}>
                    {threadAuthor?.faction}
                  </span>
                </div>
              </div>
            </div>

            <span className="text-zinc-500 text-[10px] font-mono font-bold">
              {new Date(thread.createdAt || thread.CreatedAt).toLocaleDateString()}
            </span>
          </div>

          <h1 className="relative z-10 text-3xl md:text-5xl uppercase font-black tracking-tight text-black mb-4" style={{ fontFamily: F_DISPLAY }}>
            {thread.title || thread.Title}
          </h1>

          {/* AniList Reference */}
          {thread.mediaTitle && (
            <div className="relative z-10 ink-box-thread bg-[#e8e4d8] p-4 mb-6 flex flex-col sm:flex-row items-center gap-4 shadow-[6px_6px_0px_#000]">
              <img
                src={thread.mediaCoverUrl || "https://via.placeholder.com/150"}
                alt={thread.mediaTitle}
                className="w-16 h-24 object-cover border-2 border-black shrink-0 bg-zinc-900"
              />
              <div className="flex-1">
                <span className="bg-blue-600 text-white px-2 py-0.5 text-[9px] font-black uppercase jagged-tag-thread font-mono">
                  {thread.mediaType} // ANILIST DOSSIER
                </span>
                <h3 className="text-xl uppercase font-black text-black mt-1" style={{ fontFamily: F_DISPLAY }}>
                  {thread.mediaTitle}
                </h3>
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

          <p className="relative z-10 text-sm md:text-base leading-relaxed text-zinc-900 font-medium whitespace-pre-line mb-6 font-mono">
            {thread.content || thread.Content}
          </p>

          {/* Attached Image */}
          {thread.imageUrl && (
            <div className="relative z-10 ink-box-thread overflow-hidden shadow-[8px_8px_0px_#000] mb-6 max-h-[500px] flex items-center justify-center bg-black">
              <img src={thread.imageUrl} alt="Attached Artwork" className="w-full h-auto object-contain" />
            </div>
          )}

          {/* Attached Quoted Thread Card */}
          {thread.repostOfThread && (
            <div className="relative z-10 border-2 border-black p-4 bg-[#e8e4d8] mb-6 font-mono text-xs shadow-[4px_4px_0px_#000]">
              <span className="font-bold text-[10px] text-zinc-500 uppercase block mb-1">
                Quoted Transmission from @{thread.repostOfThread.author?.username}:
              </span>
              <h4 className="font-black text-base uppercase mb-1" style={{ fontFamily: F_DISPLAY }}>
                {thread.repostOfThread.title}
              </h4>
              <p className="text-zinc-700 whitespace-pre-line line-clamp-3">
                {thread.repostOfThread.content}
              </p>
            </div>
          )}

          {/* Action Bar */}
          <div className="relative z-10 flex flex-wrap items-center justify-between pt-4 border-t-2 border-black/10 border-dashed text-xs font-mono font-bold text-zinc-600 gap-4">
            <div className="flex items-center gap-6">
              {/* Like Button */}
              <button
                onClick={handleLikeThread}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer text-sm ${
                  thread.hasLiked || thread.HasLiked ? "text-red-600 font-black" : "hover:text-red-600"
                }`}
              >
                {thread.hasLiked || thread.HasLiked ? "❤️" : "🤍"} {thread.likesCount || thread.LikesCount || 0}
              </button>

              {/* Repost Button */}
              <button
                onClick={handleRepostThread}
                className="flex items-center gap-1.5 hover:text-green-600 transition-colors cursor-pointer text-sm"
              >
                🔁 {thread.repostCount || thread.RepostCount || 0}
              </button>

              <span className="text-sm">💬 {threadComments.length}</span>
            </div>

            <div className="flex items-center gap-4">
              <span>👁 {thread.viewCount || thread.ViewCount || 0} Views</span>
            </div>
          </div>
        </div>

        {/* NESTED COMMENT STREAM */}
        <div className="mb-8">
          <h2 className="text-2xl uppercase font-black mb-4 flex items-center gap-2" style={{ fontFamily: F_DISPLAY }}>
            <span>Transmission Replies</span>
            <span className="text-sm font-bold text-zinc-500 font-mono">({threadComments.length})</span>
          </h2>

          <div className="flex flex-col gap-4">
            {topLevelComments.length > 0 ? (
              topLevelComments.map((comment: any) => {
                const commentId = comment.id || comment.Id;
                const author = comment.author || comment.Author;
                const replies = getRepliesFor(commentId);

                return (
                  <div key={commentId} className="ink-box-thread bg-white p-5 shadow-[6px_6px_0px_#000] relative overflow-hidden font-mono">
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${factionBg(author?.faction)}`} />
                    
                    {/* Comment Header */}
                    <div className="flex justify-between items-start mb-2 pl-2">
                      <div
                        onClick={() => setViewingUsername(author?.username || author?.Username)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <img
                          src={author?.avatarUrl || author?.AvatarUrl || "https://via.placeholder.com/50"}
                          alt={author?.displayName}
                          className="w-9 h-9 border-2 border-black object-cover shrink-0 bg-zinc-900 group-hover:scale-105 transition-transform"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs uppercase group-hover:text-red-600 transition-colors">
                              {author?.displayName || author?.DisplayName}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              @{author?.username || author?.Username}
                            </span>
                          </div>
                          <span className={`text-[8px] font-black uppercase px-1 py-0.2 border border-black text-white ${factionBg(author?.faction)}`}>
                            {author?.faction}
                          </span>
                        </div>
                      </div>

                      <span className="text-zinc-400 text-[10px]">
                        {new Date(comment.createdAt || comment.CreatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <p className="text-xs md:text-sm text-zinc-800 font-medium whitespace-pre-line leading-relaxed mb-3 pl-2">
                      {comment.content || comment.Content}
                    </p>

                    {/* Like & Reply Action Footer */}
                    <div className="flex items-center gap-4 text-xs font-bold border-t border-black/10 pt-2 pl-2">
                      <button
                        onClick={() => handleLikeComment(commentId)}
                        className={`flex items-center gap-1 cursor-pointer transition-colors ${
                          comment.hasLiked || comment.HasLiked ? "text-red-600" : "hover:text-red-600 text-zinc-600"
                        }`}
                      >
                        {comment.hasLiked || comment.HasLiked ? "❤️" : "🤍"} {comment.likesCount || comment.LikesCount || 0}
                      </button>

                      <button
                        onClick={() => {
                          const targetUser = author?.username || author?.Username;
                          setReplyingToComment({ id: commentId, username: targetUser });
                          setCommentText(`@${targetUser} `);
                          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                        }}
                        className="text-zinc-600 hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        💬 Reply
                      </button>
                    </div>

                    {/* Recursive / Nested Child Replies */}
                    {replies.length > 0 && (
                      <div className="mt-4 pl-4 sm:pl-6 border-l-2 border-black/30 space-y-3 pt-2">
                        {replies.map((reply: any) => {
                          const repId = reply.id || reply.Id;
                          const repAuthor = reply.author || reply.Author;

                          return (
                            <div key={repId} className="bg-[#e8e4d8] p-3 border-2 border-black relative">
                              <div className="flex justify-between items-start mb-1">
                                <div
                                  onClick={() => setViewingUsername(repAuthor?.username || repAuthor?.Username)}
                                  className="flex items-center gap-2 cursor-pointer group"
                                >
                                  <img
                                    src={repAuthor?.avatarUrl || repAuthor?.AvatarUrl || "https://via.placeholder.com/40"}
                                    alt={repAuthor?.displayName}
                                    className="w-7 h-7 border border-black object-cover shrink-0"
                                  />
                                  <span className="font-bold text-[11px] uppercase group-hover:text-red-600 transition-colors">
                                    {repAuthor?.displayName || repAuthor?.DisplayName}
                                  </span>
                                  <span className="text-[9px] text-zinc-500">
                                    @{repAuthor?.username || repAuthor?.Username}
                                  </span>
                                </div>
                                <span className="text-[9px] text-zinc-400">
                                  {new Date(reply.createdAt || reply.CreatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>

                              <p className="text-xs text-zinc-800 font-medium whitespace-pre-line leading-relaxed mb-2">
                                {reply.content || reply.Content}
                              </p>

                              <div className="flex items-center gap-3 text-[11px] font-bold">
                                <button
                                  onClick={() => handleLikeComment(repId)}
                                  className={`cursor-pointer ${
                                    reply.hasLiked || reply.HasLiked ? "text-red-600" : "text-zinc-600 hover:text-red-600"
                                  }`}
                                >
                                  {reply.hasLiked || reply.HasLiked ? "❤️" : "🤍"} {reply.likesCount || reply.LikesCount || 0}
                                </button>
                                <button
                                  onClick={() => {
                                    const targetUser = repAuthor?.username || repAuthor?.Username;
                                    setReplyingToComment({ id: commentId, username: targetUser });
                                    setCommentText(`@${targetUser} `);
                                    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                                  }}
                                  className="text-zinc-600 hover:text-blue-600 transition-colors cursor-pointer"
                                >
                                  💬 Reply
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="border-2 border-dashed border-black/40 p-8 text-center text-xs font-bold text-zinc-500 uppercase font-mono">
                No transmission replies yet. Be the first operative to respond.
              </div>
            )}
          </div>
        </div>

        {/* REPLY SUBMISSION FORM */}
        {!thread.isLocked ? (
          <form onSubmit={handlePostComment} className="ink-box-thread bg-white p-6 shadow-[8px_8px_0px_#000] relative overflow-hidden font-mono">
            {replyingToComment && (
              <div className="flex justify-between items-center bg-[#e8e4d8] border-2 border-black p-2.5 mb-3 text-xs font-bold">
                <span>Replying to @{replyingToComment.username}</span>
                <button
                  type="button"
                  onClick={() => {
                    setReplyingToComment(null);
                    setCommentText("");
                  }}
                  className="text-red-600 uppercase hover:underline"
                >
                  ✕ Cancel Reply
                </button>
              </div>
            )}

            <h3 className="text-xl uppercase font-black mb-3" style={{ fontFamily: F_DISPLAY }}>
              {replyingToComment ? "Post Response" : "Transmit Reply (+2 QP)"}
            </h3>

            <textarea
              placeholder={currentUser ? "Draft your transmission... (Tag users with @username)" : "Authenticate your operative profile to post..."}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={!currentUser || submittingComment}
              className="w-full p-3 border-2 border-black text-xs font-bold bg-[#e8e4d8] h-28 resize-none focus:outline-none focus:bg-white focus:shadow-[3px_3px_0px_var(--guild-primary)] transition-all mb-3"
              required
            />

            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold text-zinc-500">
                Identity Badge: {currentUser ? `${currentUser.gender || "Unspecified"} Operative` : "Guest"}
              </span>
              <button
                type="submit"
                disabled={!currentUser || submittingComment || !commentText.trim()}
                className="bg-black text-white px-6 py-3 font-black uppercase text-xs jagged-tag-thread border-2 border-black hover:bg-[var(--guild-primary)] hover:text-black transition-colors disabled:opacity-40 cursor-pointer shadow-[3px_3px_0px_#000]"
                style={{ fontFamily: F_DISPLAY }}
              >
                {submittingComment ? "Transmitting..." : "Send Transmission ➔"}
              </button>
            </div>
          </form>
        ) : (
          <div className="ink-box-thread bg-zinc-900 text-white p-4 text-center font-bold text-xs uppercase font-mono">
            🔒 This transmission has been sealed by Interpool Command.
          </div>
        )}
      </div>

      {/* Operative Profile Modal */}
      {viewingUsername && (
        <OperativeProfileModal
          username={viewingUsername}
          onClose={() => setViewingUsername(null)}
        />
      )}

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