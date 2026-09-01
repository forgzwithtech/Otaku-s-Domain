// src/pages/Dashboard.tsx
import { useEffect, useState, type FormEvent, useRef } from 'react';
import { apiService, updateOperativeHandle } from '../services/api';
import { uploadCompressedAvatar } from '../services/storage';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import WalletStatsCard from '../components/dashboard/WalletStatsCard';
import GlobalBackground from '../components/GlobalBackground';
import { Link } from 'react-router-dom';
import GuildInvites from '../components/GuildInvites';

interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  faction: 'None' | 'Blue' | 'Red';
  role?: 'User' | 'Moderator' | 'Admin';
  questPoints: number;
  eventCredits: number;
}

const F_DISPLAY = "'Anton', sans-serif";

function useDashboardMangaAssets() {
  useEffect(() => {
    if (document.getElementById("dash-manga-assets")) return;
    const style = document.createElement("style");
    style.id = "dash-manga-assets";
    style.innerHTML = `
      .ink-box-dash {
        border: 4px solid #000;
        border-radius: 2px 255px 3px 255px / 255px 5px 225px 3px;
      }
      .halftone-dash-dark {
        background-image: radial-gradient(rgba(0,0,0,0.6) 1.5px, transparent 1.5px);
        background-size: 6px 6px;
      }
      .dash-stamp {
        border: 3px solid currentColor;
        border-radius: 4px;
        mask-image: radial-gradient(circle, transparent 2px, black 3px);
        mask-size: 8px 8px;
        mask-position: -4px -4px;
      }
    `;
    document.head.appendChild(style);
  }, []);
}

export default function Dashboard() {
  useDashboardMangaAssets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingHandle, setSavingHandle] = useState(false);
  const [handleError, setHandleError] = useState<string | null>(null);
  const [handleSuccess, setHandleSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadUserData = async () => {
    try {
      setLoading(true);
      await apiService.syncProfile();
      const data = await apiService.getMyProfile();
      setProfile(data);
      if (data) {
        setNewUsername(data.username || "");
        setNewDisplayName(data.displayName || "");
        setNewAvatarUrl(data.avatarUrl || "");
        setAvatarPreview(data.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email}&backgroundColor=transparent`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load user portal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingAvatar(true);
    setHandleError(null);

    try {
      // Compresses to 256x256 WebP (~20KB) before hitting Supabase
      const uploadedUrl = await uploadCompressedAvatar(file, profile.id);
      setNewAvatarUrl(uploadedUrl);
      setAvatarPreview(uploadedUrl);
    } catch (err: any) {
      setHandleError(err.message || "Failed to process and upload profile image.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateHandleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSavingHandle(true);
    setHandleError(null);
    setHandleSuccess(null);

    try {
      const res = await updateOperativeHandle({
        username: newUsername,
        displayName: newDisplayName,
        avatarUrl: newAvatarUrl || undefined,
      });

      if (res.success) {
        setHandleSuccess(res.message || "Codename & avatar updated successfully.");
        if (profile) {
          setProfile({
            ...profile,
            username: res.username || newUsername,
            displayName: res.displayName || newDisplayName,
            avatarUrl: res.avatarUrl || newAvatarUrl,
          });
        }
        setTimeout(() => {
          setIsEditModalOpen(false);
          setHandleSuccess(null);
        }, 1200);
      } else {
        setHandleError(res.message || "Could not update dossier.");
      }
    } catch (err: any) {
      setHandleError(err.message || "Network transaction failure.");
    } finally {
      setSavingHandle(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden font-mono text-zinc-400 uppercase tracking-widest text-xs">
        <span className="animate-pulse">Accessing Mainframe...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white p-4 relative overflow-hidden font-mono">
        <div className="relative ink-box-dash bg-[#1a0a0a] border-red-600 text-white p-8 max-w-md text-center shadow-[10px_10px_0px_#dc2626]">
          <span className="inline-block dash-stamp text-red-500 px-4 py-1 font-black uppercase text-sm rotate-[-4deg] mb-4">
            Transmission Lost
          </span>
          <h2 className="text-4xl uppercase mb-3 tracking-tighter" style={{ fontFamily: F_DISPLAY }}>
            Access Denied
          </h2>
          <p className="text-xs font-bold mb-6 text-white/60">
            {error || 'Session invalid.'}
          </p>
          <Link
            to="/auth"
            className="inline-block bg-red-600 text-white uppercase text-xs px-6 py-3 border-2 border-white hover:bg-white hover:text-red-600 transition-colors shadow-[4px_4px_0px_#000]"
            style={{ fontFamily: F_DISPLAY }}
          >
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  const isStaff = profile.role === 'Admin' || profile.role === 'Moderator';
  const currentAvatar = profile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.email}&backgroundColor=transparent`;

  return (
    <div className="min-h-screen bg-[#050505] relative z-0 py-20 md:py-24 px-4 md:px-6 flex flex-col items-center overflow-hidden font-mono">
      <GlobalBackground />

      <div
        className="absolute top-[-15%] right-[-10%] w-[45vw] h-[45vw] rounded-full mix-blend-screen blur-[130px] opacity-20 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: "var(--guild-primary)" }}
      />

      <div className="w-full max-w-5xl flex flex-col gap-6 relative z-10">
        {/* Breadcrumb & Edit Profile CTA */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="text-white/50 hover:text-white text-[11px] uppercase tracking-widest font-bold flex items-center gap-2 transition-colors"
          >
            ← Return to Domain
          </Link>
          
          <button
            onClick={() => {
              setNewUsername(profile.username || "");
              setNewDisplayName(profile.displayName || "");
              setNewAvatarUrl(profile.avatarUrl || "");
              setAvatarPreview(currentAvatar);
              setHandleError(null);
              setHandleSuccess(null);
              setIsEditModalOpen(true);
            }}
            className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
          >
            <span>📷 Edit Profile & Avatar</span>
          </button>
        </div>

        {/* STAFF ACTION BANNER */}
        {isStaff && (
          <div className="border-4 border-black bg-yellow-400 p-4 sm:p-5 shadow-[6px_6px_0px_#000] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-[10px] font-mono font-black uppercase text-black block mb-0.5 tracking-wider">
                CLEARANCE VERIFIED // {profile.role?.toUpperCase()}
              </span>
              <h3 className="text-2xl uppercase font-black text-black leading-none" style={{ fontFamily: F_DISPLAY }}>
                Command Control Portals
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Link
                to="/interpool/mod"
                className="flex-1 sm:flex-none text-center px-4 py-2 bg-black text-white hover:bg-white hover:text-black font-mono font-bold text-xs uppercase border-2 border-black transition-colors shadow-[2px_2px_0px_#000]"
              >
                Mod Field Control ➔
              </Link>
              {profile.role === 'Admin' && (
                <Link
                  to="/interpool/admin"
                  className="flex-1 sm:flex-none text-center px-4 py-2 bg-rose-600 text-white hover:bg-black font-mono font-bold text-xs uppercase border-2 border-black transition-colors shadow-[2px_2px_0px_#000]"
                >
                  Master Admin ➔
                </Link>
              )}
            </div>
          </div>
        )}

        <DashboardHeader
  displayName={profile.displayName || profile.username}
  email={profile.email}
  faction={profile.faction}
  avatarUrl={profile.avatarUrl}
/>

        <WalletStatsCard
          questPoints={profile.questPoints}
          eventCredits={profile.eventCredits}
        />

        <GuildInvites />
      </div>

      {/* UNIQUE USERNAME & AVATAR EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d0d12] border-2 border-white/20 rounded-2xl p-6 sm:p-8 flex flex-col gap-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div>
                <h3 className="text-2xl uppercase font-black text-white" style={{ fontFamily: F_DISPLAY }}>
                  Operative Identity
                </h3>
                <span className="text-[10px] text-zinc-500 uppercase">
                  Update codename & compressed avatar
                </span>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-400 hover:text-white text-xs font-bold uppercase cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateHandleSubmit} className="flex flex-col gap-4 text-xs font-mono">
              {/* Avatar Upload with Live Preview */}
              <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 bg-zinc-900 shrink-0">
                  <img
                    src={avatarPreview}
                    alt="Avatar Preview"
                    className="w-full h-full object-cover"
                  />
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-[9px] font-bold text-white uppercase">
                      ...
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <span className="text-[10px] font-black uppercase text-zinc-400 block mb-1">
                    Custom Profile Photo
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 text-[10px] font-bold uppercase transition-colors cursor-pointer"
                  >
                    {uploadingAvatar ? "Compressing (~20KB)..." : "Upload Picture 📁"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                  <span className="text-[8px] text-zinc-500 block mt-1">
                    Auto-cropped to 256×256 WebP (~20KB).
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">
                  Unique Username (@handle)
                </label>
                <div className="flex items-center bg-black/60 border border-white/15 rounded-lg px-3 py-2 text-white focus-within:border-white">
                  <span className="text-zinc-500 mr-1">@</span>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="e.g. shadow_shinobi"
                    className="w-full bg-transparent text-white font-bold outline-none"
                    required
                    minLength={3}
                    maxLength={24}
                  />
                </div>
                <span className="text-[9px] text-zinc-500 block mt-1">
                  3-24 chars, lowercase, numbers & underscores only.
                </span>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">
                  Display Alias
                </label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Captain Levi"
                  className="w-full bg-black/60 border border-white/15 rounded-lg p-2.5 text-white font-bold outline-none focus:border-white"
                />
              </div>

              {handleError && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-400 text-[11px] font-bold">
                  ❌ {handleError}
                </div>
              )}

              {handleSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                  ✔ {handleSuccess}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingHandle || uploadingAvatar}
                  className="flex-1 py-3 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase tracking-widest transition-all cursor-pointer active:scale-98"
                >
                  {savingHandle ? "Saving Dossier..." : "Save Changes ➔"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-3 rounded-full border border-white/15 text-zinc-400 hover:text-white text-xs font-bold uppercase"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}