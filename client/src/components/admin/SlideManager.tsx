import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import { fetchAdminSlides, saveAdminSlide, deleteAdminSlide, fetchAdminUsers } from "../../services/adminApi";
import { uploadMediaAsset } from "../../services/storage";

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

export default function SlideManager() {
  const [slides, setSlides] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [editingSlide, setEditingSlide] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const initialForm = {
    panel: "01",
    tag: "",
    stamp: "",
    sfx: "",
    title1: "",
    title2: "",
    kanji: "",
    desc: "",
    btnText: "Learn More",
    imageUrl: "",
    memberName: "",
    memberAvatar: "",
    memberQuote: "",
    displayOrder: 1,
  };
  const [form, setForm] = useState(initialForm);

  const load = async () => {
    setLoading(true);
    try {
      const [slidesData, usersData] = await Promise.all([
        fetchAdminSlides(),
        fetchAdminUsers({ pageSize: 100 } as any),
      ]);
      setSlides(Array.isArray(slidesData) ? slidesData : []);
      setUsers(usersData.users || []);
    } catch (err) {
      console.error("Failed to load slides/users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Handle Image File Upload directly to Supabase Storage
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadError(null);
    try {
      const publicUrl = await uploadMediaAsset(file);
      setForm((prev) => ({ ...prev, imageUrl: publicUrl }));
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle Operative Select (Autofills name and avatar)
  const handleOperativeSelect = (userId: string) => {
    if (!userId) {
      setForm((prev) => ({ ...prev, memberName: "", memberAvatar: "" }));
      return;
    }
    const selected = users.find((u) => u.id === userId);
    if (selected) {
      setForm((prev) => ({
        ...prev,
        memberName: selected.displayName || selected.username,
        memberAvatar: selected.avatarUrl || "",
      }));
    }
  };

  const handleEdit = (slide: any) => {
    setEditingSlide(slide);
    setForm(slide);
  };

  const handleCancel = () => {
    setEditingSlide(null);
    setForm(initialForm);
    setUploadError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await saveAdminSlide(editingSlide ? { ...form, id: editingSlide.id } : form);
    handleCancel();
    load();
  };

  const handleDelete = async (id: number) => {
    if (confirm("Decommission this carousel slide?")) {
      await deleteAdminSlide(id);
      load();
    }
  };

  return (
    <div className="border-4 border-black bg-white p-6 md:p-8 shadow-[10px_10px_0px_#000] mb-8">
      <div className="mb-6 pb-4 border-b-2 border-black flex justify-between items-center">
        <div>
          <span className="text-xs font-bold text-zinc-500 uppercase" style={{ fontFamily: F_MONO }}>
            LANDING HERO PANELS
          </span>
          <h2 className="text-3xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
            Carousel & Spotlight Slides ({slides.length})
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Panel */}
        <form onSubmit={handleSubmit} className="lg:col-span-5 flex flex-col gap-3 bg-[#e8e4d8] border-2 border-black p-5 shadow-[4px_4px_0px_#000]" style={{ fontFamily: F_MONO }}>
          <h3 className="text-xl uppercase font-black mb-2" style={{ fontFamily: F_DISPLAY }}>
            {editingSlide ? `Edit Slide #${editingSlide.id}` : "Create New Slide"}
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Panel (e.g. 01)"
              value={form.panel}
              onChange={(e) => setForm({ ...form, panel: e.target.value })}
              className="p-2 border border-black text-xs font-bold bg-white"
              required
            />
            <input
              type="number"
              placeholder="Order"
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value, 10) || 0 })}
              className="p-2 border border-black text-xs font-bold bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Tag (e.g. Next IRL Drop)"
              value={form.tag || ""}
              onChange={(e) => setForm({ ...form, tag: e.target.value })}
              className="p-2 border border-black text-xs font-bold bg-white"
            />
            <input
              type="text"
              placeholder="Stamp (e.g. LIVE EVENT)"
              value={form.stamp || ""}
              onChange={(e) => setForm({ ...form, stamp: e.target.value })}
              className="p-2 border border-black text-xs font-bold bg-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Title 1"
              value={form.title1}
              onChange={(e) => setForm({ ...form, title1: e.target.value })}
              className="p-2 border border-black text-xs font-bold bg-white"
              required
            />
            <input
              type="text"
              placeholder="Title 2"
              value={form.title2}
              onChange={(e) => setForm({ ...form, title2: e.target.value })}
              className="p-2 border border-black text-xs font-bold bg-white"
              required
            />
            <input
              type="text"
              placeholder="SFX (e.g. CLASH!!)"
              value={form.sfx || ""}
              onChange={(e) => setForm({ ...form, sfx: e.target.value })}
              className="p-2 border border-black text-xs font-bold bg-white"
            />
          </div>

          <textarea
            placeholder="Slide Description..."
            value={form.desc}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
            className="p-2 border border-black text-xs font-bold bg-white h-20 resize-none"
            required
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Button Text"
              value={form.btnText}
              onChange={(e) => setForm({ ...form, btnText: e.target.value })}
              className="p-2 border border-black text-xs font-bold bg-white"
              required
            />
            <input
              type="text"
              placeholder="Kanji text (e.g. ギルド)"
              value={form.kanji || ""}
              onChange={(e) => setForm({ ...form, kanji: e.target.value })}
              className="p-2 border border-black text-xs font-bold bg-white"
            />
          </div>

          {/* Image Upload & URL Selector */}
          <div className="border border-black p-3 bg-white flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase text-zinc-600 block">Slide Artwork Asset</span>
            
            <div className="flex items-center gap-2">
              <label className="cursor-pointer bg-black text-white px-3 py-1.5 text-xs font-black uppercase hover:bg-yellow-400 hover:text-black transition-colors shrink-0">
                {uploadingImage ? "Uploading..." : "📁 Upload File"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
              
              <input
                type="text"
                placeholder="Or paste image URL (/assets/... or https://)"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                className="flex-1 p-1.5 border border-zinc-300 text-xs font-bold bg-zinc-50"
                required
              />
            </div>

            {uploadError && <span className="text-[10px] text-red-600 font-bold">{uploadError}</span>}

            {form.imageUrl && (
              <div className="flex items-center gap-3 mt-1 pt-2 border-t border-zinc-200">
                <img src={form.imageUrl} alt="Preview" className="w-12 h-12 object-cover border border-black" />
                <span className="text-[10px] font-bold text-zinc-500 truncate">{form.imageUrl}</span>
              </div>
            )}
          </div>

          {/* Operative Spotlight Autocomplete Picker */}
          <div className="border border-black p-3 bg-white flex flex-col gap-2">
            <span className="text-[10px] uppercase font-black text-zinc-600 block">
              Featured Operative Spotlight (Optional)
            </span>

            {/* Dropdown Select from registered users */}
            <select
              onChange={(e) => handleOperativeSelect(e.target.value)}
              className="p-2 border border-black text-xs font-bold bg-[#e8e4d8] uppercase focus:outline-none"
            >
              <option value="">-- Choose Operative to Spotlight --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName || u.username} ({u.faction} - {u.questPoints} QP)
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <input
                type="text"
                placeholder="Operative Name"
                value={form.memberName || ""}
                onChange={(e) => setForm({ ...form, memberName: e.target.value })}
                className="p-2 border border-black text-xs font-bold bg-zinc-50"
              />
              <input
                type="text"
                placeholder="Avatar URL"
                value={form.memberAvatar || ""}
                onChange={(e) => setForm({ ...form, memberAvatar: e.target.value })}
                className="p-2 border border-black text-xs font-bold bg-zinc-50"
              />
            </div>

            {form.memberAvatar && (
              <div className="flex items-center gap-2 mt-1">
                <img src={form.memberAvatar} alt="Avatar Preview" className="w-8 h-8 rounded-full border border-black object-cover" />
                <span className="text-[10px] font-bold text-zinc-600 truncate">{form.memberName} linked</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              disabled={uploadingImage}
              className="flex-1 bg-black text-white p-2.5 font-black uppercase text-xs hover:bg-yellow-400 hover:text-black transition-colors disabled:opacity-50"
              style={{ fontFamily: F_DISPLAY }}
            >
              {editingSlide ? "Update Slide" : "+ Add Slide"}
            </button>
            {editingSlide && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 bg-zinc-300 text-black font-bold uppercase text-xs border border-black"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Existing Slides List */}
        <div className="lg:col-span-7 flex flex-col gap-3 max-h-[650px] overflow-y-auto pr-2">
          {loading ? (
            <div className="text-xs uppercase font-bold text-zinc-500 p-8 text-center" style={{ fontFamily: F_MONO }}>Loading slides...</div>
          ) : slides.length > 0 ? (
            slides.map((s) => (
              <div key={s.id} className="border-2 border-black p-4 bg-white flex justify-between items-center shadow-[3px_3px_0px_#000]">
                <div className="flex items-center gap-3">
                  <img src={s.imageUrl || "/assets/fest.jpeg"} alt="Slide Thumbnail" className="w-16 h-16 object-cover border border-black shrink-0 bg-zinc-900" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-black text-white px-1.5 py-0.5 text-[10px] font-black uppercase" style={{ fontFamily: F_MONO }}>
                        #{s.displayOrder} [{s.panel}]
                      </span>
                      <h4 className="text-lg uppercase font-black leading-tight" style={{ fontFamily: F_DISPLAY }}>
                        {s.title1} {s.title2}
                      </h4>
                    </div>
                    <p className="text-xs text-zinc-600 line-clamp-1 mt-1" style={{ fontFamily: F_MONO }}>{s.desc}</p>
                    {s.memberName && (
                      <span className="text-[10px] font-bold text-yellow-600 uppercase block mt-0.5" style={{ fontFamily: F_MONO }}>
                        ★ Spotlight: {s.memberName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(s)}
                    className="px-3 py-1 bg-black text-white hover:bg-yellow-400 hover:text-black text-xs font-bold uppercase"
                    style={{ fontFamily: F_MONO }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="px-3 py-1 bg-red-600 text-white hover:bg-black text-xs font-bold uppercase"
                    style={{ fontFamily: F_MONO }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs uppercase font-bold text-zinc-500 p-8 text-center" style={{ fontFamily: F_MONO }}>No active custom slides recorded.</div>
          )}
        </div>
      </div>
    </div>
  );
}