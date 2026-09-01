import { useState, useEffect } from "react";
import { fetchAdminUsers, updateUserDossier } from "../../services/adminApi";

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminUsers({ search, page });
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(load, 300);
    return () => clearTimeout(debounce);
  }, [search, page]);

  const handleGrantQp = async (userId: string, amount: number) => {
    await updateUserDossier(userId, { questPointsDelta: amount });
    load();
  };

  const handleRoleChange = async (userId: string, role: string) => {
    await updateUserDossier(userId, { role });
    load();
  };

  return (
    <div className="border-4 border-black bg-white p-6 md:p-8 shadow-[10px_10px_0px_#000] mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b-2 border-black">
        <div>
          <span className="text-xs font-bold text-zinc-500 uppercase" style={{ fontFamily: F_MONO }}>
            DATABASE GOVERNANCE
          </span>
          <h2 className="text-3xl md:text-4xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
            Operative Ledgers
          </h2>
        </div>

        <input
          type="text"
          placeholder="Search username, email, ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="bg-[#e8e4d8] border-2 border-black p-2.5 font-bold text-xs uppercase w-full md:w-80 focus:outline-none"
          style={{ fontFamily: F_MONO }}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" style={{ fontFamily: F_MONO }}>
          <thead>
            <tr className="border-b-4 border-black text-xs uppercase font-black">
              <th className="p-3">Operative</th>
              <th className="p-3">Guild</th>
              <th className="p-3">Role</th>
              <th className="p-3">QP Balance</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-zinc-200 text-xs font-bold">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center uppercase text-zinc-500">
                  Scanning operative ledgers...
                </td>
              </tr>
            ) : users.length > 0 ? (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="p-3 flex items-center gap-3">
                    <img
                      src={u.avatarUrl || "https://via.placeholder.com/40"}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full border border-black object-cover"
                    />
                    <div>
                      <div className="font-black text-black">{u.displayName || u.username}</div>
                      <div className="text-[10px] text-zinc-500">{u.email}</div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-black uppercase border border-black ${
                        u.faction === "Blue"
                          ? "bg-blue-600 text-white"
                          : u.faction === "Red"
                          ? "bg-red-600 text-white"
                          : "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      {u.faction}
                    </span>
                  </td>
                  <td className="p-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-[#e8e4d8] border border-black px-2 py-1 text-[11px] font-bold uppercase"
                    >
                      <option value="Member">Member</option>
                      <option value="Moderator">Moderator</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-3 font-black text-yellow-600">{u.questPoints} QP</td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => handleGrantQp(u.id, 50)}
                      className="px-2 py-1 bg-black text-white hover:bg-yellow-400 hover:text-black border border-black text-[10px] uppercase font-black"
                    >
                      +50 QP
                    </button>
                    <button
                      onClick={() => handleGrantQp(u.id, -50)}
                      className="px-2 py-1 bg-zinc-200 text-black hover:bg-red-600 hover:text-white border border-black text-[10px] uppercase font-black"
                    >
                      -50 QP
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-500 uppercase">
                  No operatives recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}