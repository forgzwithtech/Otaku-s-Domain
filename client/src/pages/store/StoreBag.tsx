import { useState, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { checkoutStoreOrder } from "../../services/storeApi";
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

interface CartItem {
  productId: number;
  slug: string;
  title: string;
  thumbnailUrl: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
  view: string;
}

export default function StoreBag() {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("od_store_cart") || "[]");
    } catch {
      return [];
    }
  });

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [akureZone, setAkureZone] = useState(AKURE_ZONES[0]);

  const [checkingOut, setCheckingOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCustomerEmail(session.user.email || "");
        setCustomerName(session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "");
      }
    }
    loadUser();
  }, []);

  const handleUpdateQty = (index: number, delta: number) => {
    const updated = [...cart];
    const nextQty = updated[index].quantity + delta;
    if (nextQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = nextQty;
    }
    setCart(updated);
    localStorage.setItem("od_store_cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
  };

  const handleRemoveItem = (index: number) => {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
    localStorage.setItem("od_store_cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const dispatchFee = cart.length > 0 ? 1500 : 0;
  const grandTotal = subtotal + dispatchFee;

  const handleCheckout = async (e: FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setCheckingOut(true);
    setErrorMsg(null);

    try {
      const itemsPayload = cart.map((item) => ({
        productId: item.productId,
        selectedColor: item.color,
        selectedSize: item.size,
        quantity: item.quantity,
        customizationDetailsJson: JSON.stringify({
          color: item.color,
          selectedView: item.view,
        }),
      }));

      const res = await checkoutStoreOrder({
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        akureZone,
        items: itemsPayload,
      });

      if (res.authorizationUrl) {
        localStorage.removeItem("od_store_cart");
        window.dispatchEvent(new Event("storage"));
        window.location.href = res.authorizationUrl;
      } else {
        setErrorMsg(res.message || "Payment initialization failed.");
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

      {/* 100VH BAG SPLIT VIEWPORT */}
      <main className="flex-1 max-w-[96rem] w-full mx-auto px-5 sm:px-8 md:px-12 flex flex-col justify-center py-2 sm:py-4">
        <div className="mb-4 pb-2 border-b border-white/10 flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl uppercase font-bold tracking-tight" style={{ fontFamily: F_DISPLAY }}>
            Shopping Bag <span className="text-[10px] text-zinc-500 font-mono tracking-widest">[カート]</span>
          </h1>
          <Link to="/store" className="text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
            ← Continue Shopping
          </Link>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-20 border border-white/10 rounded-2xl bg-white/[0.01]">
            <p className="text-xs uppercase tracking-widest text-zinc-400 mb-4">Your bag is empty.</p>
            <Link
              to="/store"
              className="inline-block px-6 py-2.5 rounded-full bg-white text-black text-xs font-bold uppercase tracking-widest"
            >
              Browse Catalog ➔
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-h-[640px]">
            {/* LEFT: CART ITEMS SCROLLABLE LIST */}
            <div className="lg:col-span-7 flex flex-col gap-3 max-h-[520px] overflow-y-auto pr-2">
              {cart.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-white/[0.02] border border-white/10 rounded-xl flex gap-4 items-center justify-between"
                >
                  <div className="flex items-center gap-3.5">
                    {item.thumbnailUrl && (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-14 h-16 object-cover rounded-lg border border-white/10 bg-black"
                      />
                    )}
                    <div>
                      <strong className="block text-xs uppercase text-white font-medium">{item.title}</strong>
                      <span className="text-[11px] text-zinc-400 block mt-0.5">
                        Color: {item.color} • Size: {item.size}
                      </span>
                      <span className="text-xs font-bold text-white block mt-1 font-mono">
                        ₦{(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-white/20 rounded-full px-2 py-0.5 bg-black">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(idx, -1)}
                        className="text-zinc-400 hover:text-white px-1.5 font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs px-1.5 font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(idx, 1)}
                        className="text-zinc-400 hover:text-white px-1.5 font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(idx)}
                      className="text-zinc-500 hover:text-red-400 text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT: LOGISTICS & CHECKOUT FORM */}
            <form
              onSubmit={handleCheckout}
              className="lg:col-span-5 p-5 bg-white/[0.02] border border-white/10 rounded-xl flex flex-col gap-3"
            >
              <div>
                <span className="text-xs uppercase tracking-widest font-bold text-white block">
                  Delivery Details <span className="text-[9px] text-zinc-500">[配送]</span>
                </span>
                <span className="text-[10px] text-zinc-400 tracking-wider block">
                  Flat ₦1,500 dispatch across Akure
                </span>
              </div>

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
                  <span className="text-white">₦{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Akure Flat Dispatch:</span>
                  <span className="text-white">₦{dispatchFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm pt-1 border-t border-white/10 font-bold">
                  <span className="text-white">Total:</span>
                  <span className="text-white">₦{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {errorMsg && <p className="text-xs text-red-500 font-bold">{errorMsg}</p>}

              <button
                type="submit"
                disabled={checkingOut}
                className="w-full bg-white hover:bg-zinc-200 text-black py-3.5 rounded-full font-bold uppercase text-xs tracking-widest transition-all cursor-pointer mt-1 active:scale-98"
              >
                {checkingOut ? "Connecting Paystack..." : `Pay ₦${grandTotal.toLocaleString()} via Paystack ➔`}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}