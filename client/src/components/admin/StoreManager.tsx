import { useState, useEffect, type FormEvent } from "react";
import { uploadMediaAsset } from "../../services/storage";
import { supabase } from "../../lib/supabase";

const F_DISPLAY = "'Anton', sans-serif";

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "ONE SIZE"];

export default function StoreManager() {
  const [activeMainTab, setActiveMainTab] = useState<"catalog" | "categories" | "orders">("catalog");
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  // Active Product Editor State
  const [productForm, setProductForm] = useState({
    id: 0,
    categoryId: 1,
    title: "",
    slug: "",
    tagline: "",
    description: "",
    basePrice: 12500,
    thumbnailUrl: "",
    availableSizesJson: '["S","M","L","XL","XXL"]',
    isFeatured: true,
    isSoldOut: false,
  });

  // Parsed Array of active sizes for the UI checkboxes
  const [selectedSizes, setSelectedSizes] = useState<string[]>(["S", "M", "L", "XL", "XXL"]);
  const [customSizeInput, setCustomSizeInput] = useState("");

  // Variants in memory for the selected product
  const [variants, setVariants] = useState<Array<{
    id?: number;
    colorName: string;
    colorHex: string;
    angles: Array<{ viewAngleName: string; imageUrl: string }>;
    additionalPrice: number;
  }>>([]);

  const [activeVariantIndex, setActiveVariantIndex] = useState<number>(0);
  const [newAngleName, setNewAngleName] = useState("Front Chest");
  const [uploadingAngle, setUploadingAngle] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  // Category State
  const [catForm, setCatForm] = useState({ id: 0, name: "", slug: "", kanjiTitle: "", displayOrder: 1 });

  // Dispatch Email State
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState("Your Merch Will Be Delivered Today!");
  const [dispatchNote, setDispatchNote] = useState("Our dispatch rider is on the move towards your Akure drop zone.");
  const [riderContact, setRiderContact] = useState("Simbi Logistics (+234 810 123 4567)");
  const [sendingDispatch, setSendingDispatch] = useState(false);

  const apiBase = import.meta.env.VITE_API_BASE_URL || "https://otaku-s-domain.onrender.com/api";

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const pRes = await fetch(`${apiBase}/store/catalog`);
      const pData = await pRes.json();
      setProducts(pData.products || []);
      setCategories(pData.categories || []);

      if (pData.products?.length > 0) {
        const current = selectedProductId
          ? pData.products.find((p: any) => p.id === selectedProductId) || pData.products[0]
          : pData.products[0];
        selectProduct(current);
      }

      const oRes = await fetch(`${apiBase}/admin/store/orders`, {
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      });
      if (oRes.ok) {
        const oData = await oRes.json();
        setOrders(oData || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectProduct = (p: any) => {
    setSelectedProductId(p.id);
    const sizesParsed = (() => {
      try {
        return JSON.parse(p.availableSizesJson || '["S","M","L","XL","XXL"]');
      } catch {
        return ["S", "M", "L", "XL", "XXL"];
      }
    })();

    setSelectedSizes(sizesParsed);
    setProductForm({
      id: p.id,
      categoryId: p.categoryId || (categories[0]?.id ?? 1),
      title: p.title,
      slug: p.slug,
      tagline: p.tagline || "",
      description: p.description || "",
      basePrice: p.basePrice,
      thumbnailUrl: p.thumbnailUrl,
      availableSizesJson: JSON.stringify(sizesParsed),
      isFeatured: p.isFeatured,
      isSoldOut: p.isSoldOut,
    });

    const parsedVariants = (p.colorVariants || []).map((v: any) => ({
      id: v.id,
      colorName: v.colorName,
      colorHex: v.colorHex,
      angles: JSON.parse(v.angleImagesJson || "[]"),
      additionalPrice: v.additionalPrice || 0,
    }));

    setVariants(
      parsedVariants.length > 0
        ? parsedVariants
        : [{ colorName: "Obsidian Black", colorHex: "#121212", angles: [], additionalPrice: 0 }]
    );
    setActiveVariantIndex(0);
  };

  const handleAddNewProductTemplate = () => {
    const defaultSizes = ["S", "M", "L", "XL", "XXL"];
    setSelectedProductId(0);
    setSelectedSizes(defaultSizes);
    setProductForm({
      id: 0,
      categoryId: categories[0]?.id || 1,
      title: "New Streetwear Drop",
      slug: "new-streetwear-drop",
      tagline: "240 GSM Luxury Heavyweight",
      description: "Enter detailed materials, washing instructions, and fit details...",
      basePrice: 12500,
      thumbnailUrl: "/assets/fest.jpeg",
      availableSizesJson: JSON.stringify(defaultSizes),
      isFeatured: true,
      isSoldOut: false,
    });
    setVariants([
      {
        colorName: "Obsidian Black",
        colorHex: "#121212",
        angles: [{ viewAngleName: "Front View", imageUrl: "/assets/fest.jpeg" }],
        additionalPrice: 0,
      },
    ]);
    setActiveVariantIndex(0);
  };

  const toggleSize = (size: string) => {
    let updated: string[];
    if (selectedSizes.includes(size)) {
      if (selectedSizes.length <= 1) {
        alert("A garment requires at least one size available.");
        return;
      }
      updated = selectedSizes.filter((s) => s !== size);
    } else {
      updated = [...selectedSizes, size];
    }
    setSelectedSizes(updated);
    setProductForm((prev) => ({ ...prev, availableSizesJson: JSON.stringify(updated) }));
  };

  const handleAddCustomSize = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && customSizeInput.trim()) {
      e.preventDefault();
      const val = customSizeInput.trim().toUpperCase();
      if (!selectedSizes.includes(val)) {
        const updated = [...selectedSizes, val];
        setSelectedSizes(updated);
        setProductForm((prev) => ({ ...prev, availableSizesJson: JSON.stringify(updated) }));
      }
      setCustomSizeInput("");
    }
  };

  const handleAddColorVariant = () => {
    const newColor = {
      colorName: "New Color",
      colorHex: "#888888",
      angles: [],
      additionalPrice: 0,
    };
    setVariants([...variants, newColor]);
    setActiveVariantIndex(variants.length);
  };

  const handleDeleteColorVariant = (index: number) => {
    if (variants.length <= 1) {
      alert("A product requires at least 1 color option.");
      return;
    }
    const updated = variants.filter((_, i) => i !== index);
    setVariants(updated);
    setActiveVariantIndex(Math.max(0, index - 1));
  };

  const handleSaveEntireProduct = async (e: FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || ""}`,
    };

    const payloadSizes = JSON.stringify(selectedSizes);

    const pRes = await fetch(`${apiBase}/admin/store/products`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        id: productForm.id > 0 ? productForm.id : undefined,
        categoryId: productForm.categoryId,
        title: productForm.title,
        slug: productForm.slug,
        tagline: productForm.tagline,
        description: productForm.description,
        basePrice: productForm.basePrice,
        thumbnailUrl: productForm.thumbnailUrl,
        availableSizesJson: payloadSizes,
        isFeatured: productForm.isFeatured,
        isSoldOut: productForm.isSoldOut,
      }),
    });

    if (!pRes.ok) {
      alert("Failed to save product details.");
      return;
    }

    const catRefresh = await fetch(`${apiBase}/store/catalog`);
    const catData = await catRefresh.json();
    const currentSaved = catData.products.find((p: any) => p.slug === productForm.slug.trim().toLowerCase().replace(" ", "-")) || catData.products[0];
    const targetProductId = currentSaved?.id;

    for (const v of variants) {
      await fetch(`${apiBase}/admin/store/variants`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          id: v.id && v.id > 0 ? v.id : undefined,
          productId: targetProductId,
          colorName: v.colorName,
          colorHex: v.colorHex,
          angleImagesJson: JSON.stringify(v.angles),
          additionalPrice: v.additionalPrice,
        }),
      });
    }

    alert(`✅ Product "${productForm.title}" & All Color Angle Matrices Saved Successfully.`);
    await loadData();
    setSelectedProductId(targetProductId);
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Permanently delete this merchandise item and all associated color variants?")) return;
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${apiBase}/admin/store/products/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token || ""}` },
    });
    setSelectedProductId(null);
    loadData();
  };

  const handleSaveCategory = async (e: FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${apiBase}/admin/store/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
      body: JSON.stringify(catForm),
    });
    setCatForm({ id: 0, name: "", slug: "", kanjiTitle: "", displayOrder: 1 });
    loadData();
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Delete category?")) return;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${apiBase}/admin/store/categories/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token || ""}` },
    });
    if (!res.ok) alert("Cannot delete category with active products.");
    else loadData();
  };

  const handleSendDispatch = async () => {
    if (!selectedOrder) return;
    setSendingDispatch(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      await fetch(`${apiBase}/admin/store/orders/send-dispatch-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          statusHeadline: dispatchStatus,
          customNote: dispatchNote,
          riderContact,
          newOrderStatus: "Shipped",
        }),
      });
      alert(`Dispatch notification email sent to ${selectedOrder.customerEmail}`);
      setSelectedOrder(null);
      loadData();
    } finally {
      setSendingDispatch(false);
    }
  };

  const activeVariant = variants[activeVariantIndex] || variants[0];

  return (
    <div className="border-4 border-black bg-white p-5 sm:p-8 shadow-[12px_12px_0px_#000] mb-8 font-mono text-black">
      {/* Top Bar Navigation */}
      <div className="mb-6 pb-4 border-b-2 border-black flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] uppercase font-black text-rose-600 tracking-widest block mb-0.5">
            ARMOR VAULT COMMAND // STUDIO WORKSPACE
          </span>
          <h2 className="text-3xl sm:text-4xl uppercase font-black tracking-tight" style={{ fontFamily: F_DISPLAY }}>
            Store & Logistics Engine
          </h2>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-bold uppercase">
          <button
            onClick={() => setActiveMainTab("catalog")}
            className={`px-4 py-2 border-2 border-black transition-all ${
              activeMainTab === "catalog" ? "bg-black text-white shadow-[3px_3px_0px_#e11d48]" : "bg-white hover:bg-zinc-100"
            }`}
          >
            1. Merch Studio & Angles
          </button>
          <button
            onClick={() => setActiveMainTab("categories")}
            className={`px-4 py-2 border-2 border-black transition-all ${
              activeMainTab === "categories" ? "bg-black text-white shadow-[3px_3px_0px_#e11d48]" : "bg-white hover:bg-zinc-100"
            }`}
          >
            2. Categories ({categories.length})
          </button>
          <button
            onClick={() => setActiveMainTab("orders")}
            className={`px-4 py-2 border-2 border-black transition-all ${
              activeMainTab === "orders" ? "bg-black text-white shadow-[3px_3px_0px_#e11d48]" : "bg-white hover:bg-zinc-100"
            }`}
          >
            3. Akure Orders ({orders.length})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WORKSPACE 1: INTEGRATED MERCH STUDIO                                      */}
      {/* ========================================================================= */}
      {activeMainTab === "catalog" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: PRODUCTS DIRECTORY & QUICK SELECTOR */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <div className="flex justify-between items-center pb-2 border-b border-black">
              <span className="text-xs font-black uppercase text-zinc-500">Gear Roster ({products.length})</span>
              <button
                onClick={handleAddNewProductTemplate}
                className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 text-[11px] font-black uppercase border border-black shadow-[2px_2px_0px_#000]"
              >
                + New Drop Item
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-[750px] overflow-y-auto pr-1">
              {products.map((p) => {
                const isSelected = selectedProductId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => selectProduct(p)}
                    className={`p-3 text-left border-2 border-black transition-all flex justify-between items-center ${
                      isSelected
                        ? "bg-black text-white shadow-[4px_4px_0px_#e11d48] -translate-y-0.5"
                        : "bg-[#e8e4d8] hover:bg-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate mr-2">
                      <img src={p.thumbnailUrl} alt={p.title} className="w-10 h-10 object-cover border border-black/40 shrink-0" />
                      <div className="truncate">
                        <strong className="block text-xs uppercase truncate leading-tight">{p.title}</strong>
                        <span className={`text-[10px] block ${isSelected ? "text-zinc-300" : "text-zinc-600"}`}>
                          ₦{p.basePrice.toLocaleString()} • {p.colorVariants?.length || 0} Colors
                        </span>
                      </div>
                    </div>
                    {p.isSoldOut && (
                      <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 uppercase shrink-0">
                        OUT
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: MASTER STUDIO FORM & LIVE ANGLE MANAGER */}
          <form onSubmit={handleSaveEntireProduct} className="lg:col-span-8 flex flex-col gap-6 bg-[#f4f2eb] border-3 border-black p-6 shadow-[6px_6px_0px_#000]">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center border-b-2 border-black pb-2">
                <span className="text-xs font-black uppercase text-rose-600">
                  {productForm.id > 0 ? `EDITING GEAR: #${productForm.id}` : "CONFIGURING BRAND NEW DROP"}
                </span>
                {productForm.id > 0 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(productForm.id)}
                    className="text-red-600 text-[11px] font-black uppercase hover:underline"
                  >
                    Delete Product ✕
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase block mb-1">Product Title</label>
                  <input
                    type="text"
                    value={productForm.title}
                    onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                    className="w-full p-2 border-2 border-black text-xs font-bold bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase block mb-1">Price (NGN)</label>
                  <input
                    type="number"
                    value={productForm.basePrice}
                    onChange={(e) => setProductForm({ ...productForm, basePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border-2 border-black text-xs font-bold bg-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase block mb-1">URL Identifier (Slug)</label>
                  <input
                    type="text"
                    value={productForm.slug}
                    onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })}
                    className="w-full p-2 border-2 border-black text-xs font-bold bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase block mb-1">Assigned Category</label>
                  <select
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm({ ...productForm, categoryId: parseInt(e.target.value, 10) })}
                    className="w-full p-2 border-2 border-black text-xs font-bold bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} {c.kanjiTitle && `(${c.kanjiTitle})`}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SIZES MANAGEMENT SECTION */}
              <div className="border border-black p-3.5 bg-white">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-black uppercase block text-zinc-700">
                    Available Size Tiers ({selectedSizes.length} Selected)
                  </label>
                  <span className="text-[9px] text-zinc-400 uppercase font-mono">Toggle sizes for customer selection</span>
                </div>

                {/* Preset Sizes Checkboxes */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {STANDARD_SIZES.map((sz) => {
                    const isChecked = selectedSizes.includes(sz);
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => toggleSize(sz)}
                        className={`px-3 py-1.5 text-xs font-bold border-2 transition-all cursor-pointer ${
                          isChecked
                            ? "bg-black text-white border-black shadow-[2px_2px_0px_#e11d48]"
                            : "bg-[#f4f2eb] border-zinc-400 text-zinc-600 hover:border-black"
                        }`}
                      >
                        {isChecked ? `✓ ${sz}` : sz}
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Fit / Size */}
                <div className="flex items-center gap-2 pt-2 border-t border-zinc-200">
                  <input
                    type="text"
                    placeholder="Type custom size (e.g. 4XL, OS) & press Enter..."
                    value={customSizeInput}
                    onChange={(e) => setCustomSizeInput(e.target.value)}
                    onKeyDown={handleAddCustomSize}
                    className="flex-1 p-1.5 border border-black text-xs font-bold bg-[#f8fafc]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customSizeInput.trim()) {
                        const val = customSizeInput.trim().toUpperCase();
                        if (!selectedSizes.includes(val)) {
                          const updated = [...selectedSizes, val];
                          setSelectedSizes(updated);
                          setProductForm((prev) => ({ ...prev, availableSizesJson: JSON.stringify(updated) }));
                        }
                        setCustomSizeInput("");
                      }
                    }}
                    className="bg-black text-white px-3 py-1.5 text-[11px] font-black uppercase border border-black hover:bg-yellow-400 hover:text-black"
                  >
                    + Add Size
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase block mb-1">Description & Material Specs</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full p-2 border-2 border-black text-xs font-bold bg-white h-20 resize-none"
                  required
                />
              </div>

              {/* Thumbnail Upload */}
              <div className="border border-black p-3 bg-white flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img src={productForm.thumbnailUrl} alt="Thumb" className="w-12 h-12 object-cover border border-black shrink-0" />
                  <div>
                    <span className="text-[10px] font-black uppercase block text-zinc-500">Master Catalog Thumbnail</span>
                    <input
                      type="text"
                      value={productForm.thumbnailUrl}
                      onChange={(e) => setProductForm({ ...productForm, thumbnailUrl: e.target.value })}
                      className="text-xs font-bold border border-zinc-300 p-1 w-64"
                      required
                    />
                  </div>
                </div>
                <label className="cursor-pointer bg-black text-white px-3 py-1.5 text-xs font-black uppercase hover:bg-yellow-400 hover:text-black">
                  {uploadingThumb ? "Uploading..." : "📁 Upload Thumbnail"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setUploadingThumb(true);
                      try {
                        const url = await uploadMediaAsset(f);
                        setProductForm((prev) => ({ ...prev, thumbnailUrl: url }));
                      } finally {
                        setUploadingThumb(false);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* COLOR MATRIX & MULTI-ANGLE STUDIO */}
            <div className="border-t-3 border-black pt-4 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-black uppercase" style={{ fontFamily: F_DISPLAY }}>
                    Color Variants & Angle Shots
                  </h4>
                  <span className="text-[10px] text-zinc-500 block">
                    Add all available garment colors and attach view angles.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddColorVariant}
                  className="bg-black hover:bg-zinc-800 text-white px-3 py-1 text-xs font-black uppercase border border-black shadow-[2px_2px_0px_#000]"
                >
                  + Add Color Swatch
                </button>
              </div>

              {/* Color Swatches Horizontal Bar */}
              <div className="flex flex-wrap gap-2 p-2 bg-white border-2 border-black">
                {variants.map((v, i) => {
                  const isActive = activeVariantIndex === i;
                  return (
                    <div
                      key={i}
                      onClick={() => setActiveVariantIndex(i)}
                      className={`px-3 py-1.5 border-2 flex items-center gap-2 cursor-pointer transition-all ${
                        isActive
                          ? "bg-black text-white border-black shadow-[2px_2px_0px_#e11d48]"
                          : "bg-zinc-100 border-zinc-400 hover:border-black text-black"
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full border border-black" style={{ backgroundColor: v.colorHex }} />
                      <span className="text-xs font-bold uppercase">{v.colorName}</span>
                      <span className="text-[10px] opacity-70">({v.angles?.length || 0})</span>
                      {variants.length > 1 && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteColorVariant(i);
                          }}
                          className="text-red-500 hover:text-red-700 font-bold ml-1"
                        >
                          ✕
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Active Color Details & Angle Gallery */}
              {activeVariant && (
                <div className="bg-white border-2 border-black p-4 flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-zinc-200">
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Color Name</label>
                      <input
                        type="text"
                        value={activeVariant.colorName}
                        onChange={(e) => {
                          const copy = [...variants];
                          copy[activeVariantIndex].colorName = e.target.value;
                          setVariants(copy);
                        }}
                        className="w-full p-1.5 border border-black text-xs font-bold"
                        placeholder="e.g. Washed Charcoal"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase block mb-1">Color Swatch Hex</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activeVariant.colorHex}
                          onChange={(e) => {
                            const copy = [...variants];
                            copy[activeVariantIndex].colorHex = e.target.value;
                            setVariants(copy);
                          }}
                          className="w-9 h-8 border border-black cursor-pointer"
                        />
                        <input
                          type="text"
                          value={activeVariant.colorHex}
                          onChange={(e) => {
                            const copy = [...variants];
                            copy[activeVariantIndex].colorHex = e.target.value;
                            setVariants(copy);
                          }}
                          className="flex-1 p-1.5 border border-black text-xs font-bold uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Multi-Angle Image Uploader */}
                  <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                      <span className="text-xs font-black uppercase text-zinc-700">
                        Angles For "{activeVariant.colorName}" ({activeVariant.angles.length})
                      </span>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Angle Name (e.g. Front, Back)"
                          value={newAngleName}
                          onChange={(e) => setNewAngleName(e.target.value)}
                          className="p-1 text-xs border border-black font-bold w-36"
                        />
                        <label className="cursor-pointer bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 text-[11px] font-black uppercase border border-black">
                          {uploadingAngle ? "Uploading..." : "+ Add Angle Image"}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              setUploadingAngle(true);
                              try {
                                const url = await uploadMediaAsset(f);
                                const copy = [...variants];
                                copy[activeVariantIndex].angles.push({
                                  viewAngleName: newAngleName.trim() || `Angle ${copy[activeVariantIndex].angles.length + 1}`,
                                  imageUrl: url,
                                });
                                setVariants(copy);
                              } finally {
                                setUploadingAngle(false);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Angle Grid Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {activeVariant.angles.map((ang, aIdx) => (
                        <div key={aIdx} className="border-2 border-black p-2 bg-[#f4f2eb] relative group">
                          <img src={ang.imageUrl} alt={ang.viewAngleName} className="w-full aspect-[4/5] object-cover mb-1 border border-black/20" />
                          <input
                            type="text"
                            value={ang.viewAngleName}
                            onChange={(e) => {
                              const copy = [...variants];
                              copy[activeVariantIndex].angles[aIdx].viewAngleName = e.target.value;
                              setVariants(copy);
                            }}
                            className="w-full p-1 text-[10px] font-bold border border-black bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const copy = [...variants];
                              copy[activeVariantIndex].angles = copy[activeVariantIndex].angles.filter((_, idx) => idx !== aIdx);
                              setVariants(copy);
                            }}
                            className="absolute top-1 right-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 border border-black shadow-[1px_1px_0px_#000]"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Global Master Save Action */}
            <div className="flex gap-3 pt-3 border-t-2 border-black">
              <button
                type="submit"
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-4 font-black uppercase text-sm tracking-wider border-2 border-black shadow-[4px_4px_0px_#000] cursor-pointer"
                style={{ fontFamily: F_DISPLAY }}
              >
                Save Entire Product Matrix ➔
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* WORKSPACE 2: STORE CATEGORIES MANAGEMENT                                  */}
      {/* ========================================================================= */}
      {activeMainTab === "categories" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form onSubmit={handleSaveCategory} className="lg:col-span-6 bg-[#e8e4d8] border-2 border-black p-5 flex flex-col gap-3">
            <h3 className="text-xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>Add / Edit Category</h3>
            <input
              type="text"
              placeholder="Category Name (e.g. Hoodies & Outerwear)"
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              className="p-2 border-2 border-black text-xs bg-white font-bold"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Slug (e.g. hoodies)"
                value={catForm.slug}
                onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                className="p-2 border-2 border-black text-xs bg-white font-bold"
                required
              />
              <input
                type="text"
                placeholder="Kanji Subtitle (e.g. 羽織)"
                value={catForm.kanjiTitle}
                onChange={(e) => setCatForm({ ...catForm, kanjiTitle: e.target.value })}
                className="p-2 border-2 border-black text-xs bg-white font-bold"
              />
            </div>
            <button type="submit" className="bg-black text-white py-2.5 font-black uppercase text-xs hover:bg-yellow-400 hover:text-black">
              Save Category ➔
            </button>
          </form>

          <div className="lg:col-span-6 flex flex-col gap-2">
            <span className="text-xs font-black uppercase text-zinc-500">Live Categories ({categories.length})</span>
            {categories.map((c) => (
              <div key={c.id} className="p-3 border-2 border-black bg-white flex justify-between items-center text-xs">
                <div>
                  <strong className="block text-sm uppercase">{c.name} {c.kanjiTitle && `(${c.kanjiTitle})`}</strong>
                  <span className="text-zinc-500 font-mono">Slug: {c.slug}</span>
                </div>
                <button
                  onClick={() => handleDeleteCategory(c.id)}
                  className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold uppercase"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* WORKSPACE 3: AKURE ORDERS & DISPATCH NOTIFICATIONS                        */}
      {/* ========================================================================= */}
      {activeMainTab === "orders" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-xs font-black uppercase text-zinc-600 block">
                Akure Distribution Ledger ({orders.length} Total Orders)
              </span>
              <span className="text-[10px] text-zinc-400">
                Detailed customer order data, selected colorways, sizes, and line items
              </span>
            </div>
            <button onClick={loadData} className="text-xs text-blue-600 underline font-bold">
              ↻ Refresh Orders
            </button>
          </div>

          <div className="border-2 border-black max-h-[620px] overflow-y-auto bg-white mb-6 shadow-[6px_6px_0px_#000]">
            <table className="w-full text-left text-xs">
              <thead className="bg-black text-white text-[10px] uppercase">
                <tr>
                  <th className="p-3">Order / Date</th>
                  <th className="p-3">Customer Info</th>
                  <th className="p-3">Akure Drop Zone</th>
                  <th className="p-3 min-w-[280px]">Ordered Gear Breakdown</th>
                  <th className="p-3">Total Paid</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-zinc-200 hover:bg-zinc-50 align-top">
                    {/* Order Number & Timestamp */}
                    <td className="p-3 font-mono">
                      <strong className="block font-black text-black">{o.orderNumber}</strong>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(o.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {o.paymentReference && (
                        <span className="block text-[8px] text-zinc-400 truncate max-w-[100px] mt-0.5">
                          Ref: {o.paymentReference}
                        </span>
                      )}
                    </td>

                    {/* Customer Contact */}
                    <td className="p-3">
                      <strong className="block text-black">{o.customerName}</strong>
                      <span className="text-[10px] text-zinc-600 block">{o.customerPhone}</span>
                      <span className="text-[10px] text-zinc-500 block truncate max-w-[140px]">{o.customerEmail}</span>
                    </td>

                    {/* Destination Address */}
                    <td className="p-3">
                      <span className="bg-yellow-300 text-black px-1.5 py-0.5 text-[9px] font-black uppercase inline-block mb-1 border border-black">
                        {o.akureZone}
                      </span>
                      <span className="block text-[10px] text-zinc-700 leading-tight">{o.shippingAddress}</span>
                    </td>

                    {/* ORDERED GEAR ITEMS DETAILED BREAKDOWN */}
                    <td className="p-3">
                      <div className="flex flex-col gap-2">
                        {o.items?.map((item: any) => {
                          let customDetails: any = null;
                          try {
                            customDetails = item.customizationDetailsJson
                              ? JSON.parse(item.customizationDetailsJson)
                              : null;
                          } catch {
                            customDetails = null;
                          }

                          return (
                            <div
                              key={item.id}
                              className="p-2 border border-zinc-300 bg-zinc-100/70 text-[11px] flex gap-2.5 items-start rounded-sm"
                            >
                              {item.productThumbnail && (
                                <img
                                  src={item.productThumbnail}
                                  alt={item.productTitle}
                                  className="w-10 h-12 object-cover border border-zinc-400 bg-zinc-900 shrink-0"
                                />
                              )}
                              <div className="flex-1">
                                <strong className="block text-black uppercase text-[11px] leading-tight">
                                  {item.productTitle}
                                </strong>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-600 font-bold">
                                  <span>Color: <strong className="text-black">{item.selectedColor}</strong></span>
                                  <span>•</span>
                                  <span>Size: <strong className="text-black">{item.selectedSize}</strong></span>
                                  <span>•</span>
                                  <span>Qty: <strong className="text-black">{item.quantity}</strong></span>
                                </div>

                                {customDetails && (
                                  <div className="mt-1 pt-1 border-t border-zinc-300 text-[9px] text-zinc-600">
                                    {customDetails.frontVariant && (
                                      <span className="block font-medium">
                                        👕 Front: <strong className="text-zinc-900">{customDetails.frontVariant}</strong>
                                      </span>
                                    )}
                                    {customDetails.backVariant && (
                                      <span className="block font-medium">
                                        🛡 Back: <strong className="text-zinc-900">{customDetails.backVariant}</strong>
                                      </span>
                                    )}
                                    {customDetails.selectedView && (
                                      <span className="block font-medium">
                                        📐 View: <strong className="text-zinc-900">{customDetails.selectedView}</strong>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>

                    {/* Price & Delivery */}
                    <td className="p-3 font-mono">
                      <span className="text-xs font-black text-black block">₦{o.totalAmount.toLocaleString()}</span>
                      <span className="text-[9px] text-zinc-500 block">
                        (₦{o.subtotal.toLocaleString()} + ₦{o.deliveryFee.toLocaleString()} dispatch)
                      </span>
                    </td>

                    {/* Paid / Order Status */}
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 text-[9px] font-black uppercase border border-black inline-block ${
                          o.orderStatus === "Paid"
                            ? "bg-green-500 text-black"
                            : o.orderStatus === "Shipped"
                            ? "bg-blue-600 text-white"
                            : "bg-zinc-800 text-white"
                        }`}
                      >
                        {o.orderStatus}
                      </span>
                      <span className="block text-[8px] text-zinc-500 mt-1 uppercase font-bold">
                        {o.isPaid ? "✔ Paid" : "⏳ Unpaid"}
                      </span>
                    </td>

                    {/* 1-Click Dispatch Email */}
                    <td className="p-3">
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="bg-black hover:bg-rose-600 text-white px-2.5 py-1.5 text-[10px] font-black uppercase transition-colors shadow-[2px_2px_0px_#000] whitespace-nowrap cursor-pointer"
                      >
                        ✉ Dispatch Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Dispatch Notice Modal */}
          {selectedOrder && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white border-4 border-black p-6 max-w-lg w-full shadow-[14px_14px_0px_#000]">
                <div className="flex justify-between items-center mb-4 pb-2 border-b-2 border-black">
                  <h3 className="text-xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
                    Dispatch Transmission // #{selectedOrder.orderNumber}
                  </h3>
                  <button onClick={() => setSelectedOrder(null)} className="font-black text-xs cursor-pointer">✕</button>
                </div>

                <div className="flex flex-col gap-3 text-xs font-mono">
                  <div>
                    <label className="text-[10px] uppercase font-black block mb-1">Status Headline</label>
                    <select
                      value={dispatchStatus}
                      onChange={(e) => setDispatchStatus(e.target.value)}
                      className="w-full p-2 border-2 border-black font-bold bg-zinc-50"
                    >
                      <option value="Order Recieved">Order Recieved</option>  
                      <option value="Your Merch Will Be Delivered Today!">Your Merch Will Be Delivered Today! 🏍</option>
                      <option value="Out for Delivery in Akure!">Out for Delivery in Akure! 📦</option>
                      <option value="Arriving in 2 Days — Order Packed!">Arriving in 2 Days — Order Packed! ⚡</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black block mb-1">Custom Message to Customer</label>
                    <textarea
                      value={dispatchNote}
                      onChange={(e) => setDispatchNote(e.target.value)}
                      className="w-full p-2 border-2 border-black h-20 resize-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black block mb-1">Rider Contact / Logistics Partner</label>
                    <input
                      type="text"
                      value={riderContact}
                      onChange={(e) => setRiderContact(e.target.value)}
                      className="w-full p-2 border-2 border-black font-bold"
                    />
                  </div>

                  <button
                    onClick={handleSendDispatch}
                    disabled={sendingDispatch}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white py-3.5 font-black uppercase text-xs tracking-wider transition-colors mt-2 shadow-[4px_4px_0px_#000] cursor-pointer"
                  >
                    {sendingDispatch ? "Transmitting Signal..." : "Transmit Dispatch Notification ➔"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}