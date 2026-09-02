// client/src/components/forum/OperativeProfileModal.tsx
import { useEffect, useState } from "react";
import { fetchOperativeProfile } from "../../services/forumApi";

const F_DISPLAY = "'Anton', sans-serif";

interface OperativeProfileModalProps {
  username: string;
  onClose: () => void;
}

export default function OperativeProfileModal({ username, onClose }: OperativeProfileModalProps) {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchOperativeProfile(username);
        setProfile(data);
      } catch (err) {
        console.error("Failed to load operative profile:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [username]);

  const factionBg = (faction?: string) =>
    faction === "Blue" ? "bg-[#1a4a9c]" : faction === "Red" ? "bg-[#b01e33]" : "bg-purple-600";

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#e8e4d8] border-4 border-black p-6 max-w-md w-full shadow-[12px_12px_0px_#000] relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 bg-black text-white px-2.5 py-1 text-xs font-mono font-bold hover:bg-red-600 transition-colors cursor-pointer"
        >
          ✕
        </button>

        {loading ? (
          <div className="py-12 text-center font-mono font-bold text-xs uppercase animate-pulse">
            ⚡ Decrypting Operative Dossier...
          </div>
        ) : profile ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 border-b-2 border-black pb-4">
              <img
                src={profile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                alt={profile.displayName}
                className="w-16 h-16 border-2 border-black object-cover bg-zinc-900"
              />
              <div>
                <h3 className="text-2xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
                  {profile.displayName}
                </h3>
                <span className="text-xs font-mono font-bold text-zinc-600 block">
                  @{profile.username}
                </span>
                <div className="flex gap-2 mt-1">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 border border-black text-white ${factionBg(profile.faction)}`}>
                    {profile.faction} Faction
                  </span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 border border-black bg-black text-white">
                    {profile.role}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="border border-black p-2 bg-white">
                <span className="text-[10px] block text-zinc-500 font-bold uppercase">QP Score</span>
                <span className="text-sm font-black text-yellow-600">⚡ {profile.questPoints}</span>
              </div>
              <div className="border border-black p-2 bg-white">
                <span className="text-[10px] block text-zinc-500 font-bold uppercase">Transmissions</span>
                <span className="text-sm font-black text-black">{profile.stats?.threadsCount || 0}</span>
              </div>
              <div className="border border-black p-2 bg-white">
                <span className="text-[10px] block text-zinc-500 font-bold uppercase">Endorsements</span>
                <span className="text-sm font-black text-red-600">❤️ {profile.stats?.totalLikesReceived || 0}</span>
              </div>
            </div>

            <div className="text-[11px] font-mono text-zinc-500 pt-2 border-t border-black/10">
              Operative enlisted on {new Date(profile.createdAt).toLocaleDateString()}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center font-mono font-bold text-xs uppercase text-red-600">
            Dossier purged or unavailable.
          </div>
        )}
      </div>
    </div>
  );
}