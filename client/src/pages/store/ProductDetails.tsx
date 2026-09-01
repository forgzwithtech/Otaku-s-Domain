import { useState, useEffect, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchProductBySlug, checkoutStoreOrder } from "../../services/storeApi";
import { supabase } from "../../lib/supabase";

const F_DISPLAY = "'Anton', sans-serif";

const AKURE_ZONES = [
  "FUTA South Gate / Obakekere",
  "FUTA North Gate / Aule Area",
  "Alagbaka GRA / Government Reserve",
  "Ijapo Estate",
  "Oba-Ile Housing Estate",
  "Federal Secretariat / Ilesha Garage",
  "Oda Road / Shoprite Mall Corridor",
  "Onyearugbulem / Arakale Market Axis",
];

interface Angle {
  viewAngleName: string;
  imageUrl: string;
}

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Configuration State
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [selectedAngleIndex, setSelectedAngleIndex] = useState<number>(0);
  const [selectedSize, setSelectedSize] = useState<string>("L");
  const [quantity, setQuantity] = useState<number>(1);
  const [addedNotice, setAddedNotice] = useState(false);

  // Express Checkout Slide-Over Modal State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [akureZone, setAkureZone] = useState(AKURE_ZONES[0]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      setLoading(true);
      try {
        const data = await fetchProductBySlug(slug);
        setProduct(data);
        if (data.colorVariants && data.colorVariants.length > 0) {
          setSelectedVariant(data.colorVariants[0]);
          setSelectedAngleIndex(0);
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCustomerEmail(session.user.email || "");
          setCustomerName(session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "");
        }
      } catch (err) {
        console.error("Failed to load product details:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060608] flex items-center justify-center font-mono text-zinc-400 text-xs uppercase tracking-widest">
        <span className="animate-pulse">Loading Piece Dossier...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#060608] flex flex-col items-center justify-center font-mono text-zinc-400 text-xs uppercase tracking-widest gap-4">
        <span>Product not found in archive.</span>
        <Link to="/store" className="text-white underline">Return to Store</Link>
      </div>
    );
  }

  let angles: Angle[] = [];
  try {
    angles = selectedVariant ? JSON.parse(selectedVariant.angleImagesJson || "[]") : [];
  } catch {
    angles = [];
  }

  let sizes: string[] = ["S", "M", "L", "XL", "XXL"];
  try {
    sizes = JSON.parse(product.availableSizesJson || '["S","M","L","XL","XXL"]');
  } catch {
    sizes = ["S", "M", "L", "XL", "XXL"];
  }

  const currentDisplayImage = angles[selectedAngleIndex]?.imageUrl || product.thumbnailUrl || "/assets/fest.jpeg";
  const unitPrice = product.basePrice + (selectedVariant?.additionalPrice || 0);
  const itemsSubtotal = unitPrice * quantity;
  const dispatchFee = 1500;
  const grandTotal = itemsSubtotal + dispatchFee;

  const handleAddToCart = () => {
    try {
      const stored = JSON.parse(localStorage.getItem("od_store_cart") || "[]");
      const newItem = {
        productId: product.id,
        slug: product.slug,
        title: product.title,
        thumbnailUrl: currentDisplayImage,
        color: selectedVariant?.colorName || "Standard",
        size: selectedSize,
        quantity,
        price: unitPrice,
        view: angles[selectedAngleIndex]?.viewAngleName || "Standard View",
      };
      stored.push(newItem);
      localStorage.setItem("od_store_cart", JSON.stringify(stored));
      window.dispatchEvent(new Event("storage"));
      setAddedNotice(true);
      setTimeout(() => setAddedNotice(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckoutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCheckingOut(true);
    setErrorMsg(null);

    const customizationDetails = {
      color: selectedVariant?.colorName || "Standard",
      selectedView: angles[selectedAngleIndex]?.viewAngleName || "Default View",
    };

    try {
      const res = await checkoutStoreOrder({
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        akureZone,
        items: [
          {
            productId: product.id,
            selectedColor: selectedVariant?.colorName || "Standard",
            selectedSize,
            quantity,
            customizationDetailsJson: JSON.stringify(customizationDetails),
          },
        ],
      });

      if (res.authorizationUrl) {
        window.location.href = res.authorizationUrl;
      } else {
        setErrorMsg(res.message || "Payment checkout rejected.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network transaction failure.");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen bg-[#060608] text-white selection:bg-white selection:text-black font-mono flex flex-col justify-between overflow-x-hidden lg:overflow-hidden">
      <div className="h-16 shrink-0" />

      {/* RESPONSIVE VIEWPORT CONTAINER */}
      <main className="flex-1 max-w-[96rem] w-full mx-auto px-5 sm:px-8 md:px-12 flex flex-col justify-center py-2 sm:py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
          {/* ========================================================= */}
          {/* LEFT: 4:5 HIGH-FASHION MEDIA CANVAS                      */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center gap-3">
            <div className="relative w-full max-w-[460px] lg:max-w-[480px] aspect-[4/5] max-h-[50vh] lg:max-h-[58vh] bg-black/60 border border-white/10 rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl">
              <img
                src={currentDisplayImage}
                alt={product.title}
                className="w-full h-full object-cover transition-opacity duration-300 ease-out"
              />

              {angles[selectedAngleIndex]?.viewAngleName && (
                <span className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-[9px] uppercase tracking-widest text-zinc-300">
                  {angles[selectedAngleIndex].viewAngleName}
                </span>
              )}
            </div>

            {/* Custom Multi-Angle Thumbnails */}
            {angles.length > 1 && (
              <div className="flex gap-2 justify-center overflow-x-auto py-1 max-w-full">
                {angles.map((ang, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedAngleIndex(idx)}
                    className={`p-0.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
                      selectedAngleIndex === idx
                        ? "border-white bg-white/15 scale-105"
                        : "border-white/10 bg-black/40 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={ang.imageUrl} alt={ang.viewAngleName} className="w-10 h-12 sm:w-12 sm:h-14 object-cover rounded-md" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* RIGHT: COMPACT PIECE SPECIFICATIONS & ACTIONS            */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 flex flex-col justify-center gap-4 max-w-xl mx-auto w-full pb-20 lg:pb-0">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mb-0.5">
                {product.category?.name || "Apparel"} <span className="text-zinc-600">[衣類]</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl uppercase font-bold tracking-tight text-white leading-none" style={{ fontFamily: F_DISPLAY }}>
                {product.title}
              </h1>
              <p className="text-xs text-zinc-400 font-light mt-1.5 line-clamp-2 leading-relaxed">
                {product.description}
              </p>
              <div className="text-xl sm:text-2xl font-bold text-white mt-2 tracking-wide">
                ₦{unitPrice.toLocaleString()}
              </div>
            </div>

            {/* 1. Colorway Selection */}
            {product.colorVariants && product.colorVariants.length > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-400 block mb-1.5">
                  Colorway: <strong className="text-white">{selectedVariant?.colorName}</strong>
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {product.colorVariants.map((v: any) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedVariant(v);
                        setSelectedAngleIndex(0);
                      }}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                        selectedVariant?.id === v.id ? "border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "border-white/20 hover:border-white/60"
                      }`}
                      style={{ backgroundColor: v.colorHex }}
                      title={v.colorName}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 2. Size Selection */}
            {sizes.length > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-400 block mb-1.5">
                  Select Size
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`px-3 py-1 text-xs font-bold uppercase rounded-md border transition-all cursor-pointer ${
                        selectedSize === s
                          ? "bg-white text-black border-white"
                          : "border-white/10 text-zinc-400 hover:border-white/40 hover:text-white"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Quantity */}
            <div>
              <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-400 block mb-1">
                Quantity
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-white/20 rounded-full px-2 py-0.5 bg-white/5">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-2 text-zinc-400 hover:text-white font-bold cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-2 text-xs font-bold text-white">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-2 text-zinc-400 hover:text-white font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Desktop Buttons */}
            <div className="hidden lg:flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 py-3 rounded-full border border-white/20 hover:border-white text-white hover:bg-white/10 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer active:scale-98"
              >
                {addedNotice ? "✔ Added to Bag" : "Add to Bag"}
              </button>

              <button
                type="button"
                onClick={() => setCheckoutModalOpen(true)}
                className="flex-1 py-3 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] cursor-pointer active:scale-98"
              >
                Express Order ➔
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* MOBILE STICKY BOTTOM ACTION DOCK */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 p-4 bg-black/90 backdrop-blur-xl border-t border-white/10 flex items-center gap-3">
        <button
          type="button"
          onClick={handleAddToCart}
          className="flex-1 py-3 rounded-full border border-white/20 text-white text-xs font-bold uppercase tracking-wider active:scale-95 transition-transform"
        >
          {addedNotice ? "✔ Added" : "Add to Bag"}
        </button>
        <button
          type="button"
          onClick={() => setCheckoutModalOpen(true)}
          className="flex-1 py-3 rounded-full bg-white text-black text-xs font-bold uppercase tracking-wider active:scale-95 transition-transform"
        >
          Order Now ➔
        </button>
      </div>

      {/* EXPRESS CHECKOUT MODAL */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0d0d12] border border-white/20 rounded-2xl p-6 sm:p-8 flex flex-col gap-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div>
                <h3 className="text-xl uppercase font-black text-white" style={{ fontFamily: F_DISPLAY }}>
                  Akure Sector Checkout
                </h3>
                <span className="text-[10px] text-zinc-500 uppercase">
                  Fast delivery across Akure • Flat ₦1,500
                </span>
              </div>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="text-zinc-400 hover:text-white text-xs font-bold uppercase cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Recipient Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="p-2.5 bg-black/50 border border-white/10 rounded-lg text-xs text-white focus:border-white outline-none"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone (0810...)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="p-2.5 bg-black/50 border border-white/10 rounded-lg text-xs text-white focus:border-white outline-none"
                  required
                />
              </div>

              <input
                type="email"
                placeholder="Email Address"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="p-2.5 bg-black/50 border border-white/10 rounded-lg text-xs text-white focus:border-white outline-none"
                required
              />

              <select
                value={akureZone}
                onChange={(e) => setAkureZone(e.target.value)}
                className="w-full p-2.5 bg-black border border-white/10 rounded-lg text-xs text-white focus:border-white outline-none"
              >
                {AKURE_ZONES.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>

              <textarea
                placeholder="Street Address / Room / Landmark in Akure..."
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="p-2.5 bg-black/50 border border-white/10 rounded-lg text-xs text-white focus:border-white outline-none h-16 resize-none"
                required
              />

              <div className="text-xs text-zinc-400 pt-2 border-t border-white/10 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="text-white font-mono">₦{itemsSubtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Akure Flat Dispatch:</span>
                  <span className="text-white font-mono">₦{dispatchFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm pt-1 border-t border-white/10 font-bold">
                  <span className="text-white">Total Amount:</span>
                  <span className="text-white font-mono">₦{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {errorMsg && <p className="text-xs text-red-500 font-bold">{errorMsg}</p>}

              <button
                type="submit"
                disabled={checkingOut}
                className="w-full bg-white hover:bg-zinc-200 text-black py-3.5 rounded-full font-bold uppercase text-xs tracking-widest transition-all cursor-pointer mt-1"
              >
                {checkingOut ? "Connecting Paystack..." : `Pay ₦${grandTotal.toLocaleString()} via Paystack ➔`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}