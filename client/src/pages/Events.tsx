import { useState, useEffect, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import { fetchAllEvents, fetchPresaleStatus, initializeTicketPayment } from "../services/eventsApi";
import { supabase } from "../lib/supabase";

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";
const F_SFX = "'Bangers', cursive";

function useEventMangaAssets() {
  useEffect(() => {
    if (document.getElementById("events-manga-assets")) return;
    const style = document.createElement("style");
    style.id = "events-manga-assets";
    style.innerHTML = `
      .ink-box-event {
        border: 4px solid #000;
        border-radius: 2px 255px 3px 255px / 255px 5px 225px 3px;
      }
      .halftone-event-dark {
        background-image: radial-gradient(rgba(0,0,0,0.5) 1.5px, transparent 1.5px);
        background-size: 6px 6px;
      }
      .jagged-tag-event {
        clip-path: polygon(0% 15%, 8% 0%, 92% 0%, 100% 15%, 100% 85%, 92% 100%, 8% 100%, 0% 85%);
      }
      .speed-diag-event {
        background-image: repeating-linear-gradient(115deg, transparent 0px, transparent 12px, rgba(0,0,0,0.04) 12px, rgba(0,0,0,0.04) 14px);
      }
      .redacted-bar {
        background: repeating-linear-gradient(45deg, #18181b, #18181b 8px, #27272a 8px, #27272a 16px);
      }
    `;
    document.head.appendChild(style);
  }, []);
}

export default function Events() {
  useEventMangaAssets();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [presaleDiscount, setPresaleDiscount] = useState<number>(0);
  const [hasActivePresale, setHasActivePresale] = useState<boolean>(false);

  // Checkout Modal State
  const [selectedStage, setSelectedStage] = useState<any | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<any | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await fetchAllEvents();
      setEvents(list);

      const activeEvent = list.length > 0 ? (selectedEventId ? list.find((e: any) => e.id === selectedEventId) || list[0] : list[0]) : null;
      if (activeEvent) {
        setSelectedEventId(activeEvent.id);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setGuestEmail(session.user.email || "");
        setGuestName(session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "");
      }
    } catch (err) {
      console.error("Failed to load events telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync presale voucher state whenever selected event or authenticated session changes
  useEffect(() => {
    async function checkPresale() {
      if (selectedEventId && user) {
        try {
          const presale = await fetchPresaleStatus(selectedEventId);
          setHasActivePresale(Boolean(presale.hasPresaleDiscount));
          setPresaleDiscount(presale.hasPresaleDiscount ? presale.discountAmount : 0);
        } catch {
          setHasActivePresale(false);
          setPresaleDiscount(0);
        }
      } else {
        setHasActivePresale(false);
        setPresaleDiscount(0);
      }
    }
    checkPresale();
  }, [selectedEventId, user]);

  const currentEvent = events.find((e) => e.id === selectedEventId) || events[0];

  const handleOpenBuy = (stage: any) => {
    if (stage.isSoldOut || stage.basePrice === null || stage.basePrice === undefined) return;
    if (!user) {
      alert("Operative authentication required. Please sign in to proceed.");
      return;
    }
    setSelectedStage(stage);
    setStatusError(null);
  };

  const handleCompleteOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStage) return;

    setPurchasing(true);
    setStatusError(null);
    try {
      const res = await initializeTicketPayment({
        stageId: selectedStage.id,
        couponCode: couponCode.trim() || undefined,
        guestName,
        guestEmail,
      });

      // Gateway Redirect to Paystack
      if (res.authorizationUrl) {
        window.location.href = res.authorizationUrl;
        return;
      }

      if (res.success && res.ticketId) {
        setPurchaseResult({
          id: res.ticketId,
          stageName: selectedStage.stageName,
          price: res.finalPrice,
          isPresale: res.isPresale,
          discountLocked: res.discountLocked,
          guestName,
          eventTitle: currentEvent.title,
          date: currentEvent.eventDateUtc,
        });
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
        setSelectedStage(null);
        loadData();
      } else {
        setStatusError(res.message || "Payment initialization failed.");
      }
    } catch (err: any) {
      setStatusError(err.message || "Network transaction failure.");
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e8e4d8] pt-36 text-center font-bold text-black uppercase" style={{ fontFamily: F_MONO }}>
        ⚡ Intercepting Guild Live Frequencies...
      </div>
    );
  }

  if (!currentEvent) {
    return (
      <div className="min-h-screen bg-[#e8e4d8] pt-36 text-center font-bold text-black uppercase" style={{ fontFamily: F_MONO }}>
        No live sector events scheduled.
      </div>
    );
  }

  const hypeReels = currentEvent.mediaHypeReelsJson ? JSON.parse(currentEvent.mediaHypeReelsJson) : [];

  return (
    <div className="min-h-screen bg-[#e8e4d8] pt-20 md:pt-24 pb-28 px-3 sm:px-4 md:px-8 text-black relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.12] halftone-event-dark pointer-events-none" />

      <div className="max-w-[102rem] mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ========================================================= */}
          {/* LEFT: EVENT SELECTION SIDEBAR                             */}
          {/* ========================================================= */}
          <div className="lg:col-span-3 flex flex-col gap-3" style={{ fontFamily: F_MONO }}>
            <div className="flex items-center justify-between pb-2 border-b-2 border-black">
              <span className="text-xs uppercase font-bold text-zinc-600 tracking-wider">
                SECTOR OPS ({events.length})
              </span>
              <span className="text-[10px] bg-black text-white px-2 py-0.5 uppercase font-bold jagged-tag-event">
                LIVE DIRECTORY
              </span>
            </div>

            <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-2 -mx-1 px-1 lg:mx-0 lg:px-0">
              {events.map((evt) => {
                const isSelected = evt.id === currentEvent.id;
                return (
                  <button
                    key={evt.id}
                    onClick={() => setSelectedEventId(evt.id)}
                    className={`p-3.5 text-left ink-box-event transition-all flex flex-col min-w-[240px] lg:min-w-0 cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? "bg-black text-white shadow-[6px_6px_0px_var(--guild-primary)] -translate-y-1"
                        : "bg-white hover:bg-zinc-100 shadow-[4px_4px_0px_#000]"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full mb-1.5">
                      <span className="text-[9px] uppercase font-black text-yellow-400 bg-zinc-900 px-2 py-0.5 border border-black/20">
                        {new Date(evt.eventDateUtc).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      {evt.isActive && (
                        <span className="text-[9px] font-black uppercase text-green-400 animate-pulse">
                          ● ACTIVE
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg uppercase font-black truncate leading-tight mb-1" style={{ fontFamily: F_DISPLAY }}>
                      {evt.title}
                    </h3>
                    <span className="text-[10px] opacity-70 truncate font-mono">📍 {evt.locationName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT: MAIN EVENT CANVAS                                  */}
          {/* ========================================================= */}
          <div className="lg:col-span-9 flex flex-col gap-8">
            {/* HERO POSTER & DETAILS SECTION */}
            <div className="ink-box-event bg-white p-5 sm:p-7 md:p-10 shadow-[12px_12px_0px_#000] relative overflow-hidden">
              <div className="absolute inset-0 speed-diag-event pointer-events-none" />

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative z-10">
                {/* Full-Length Portrait Poster */}
                <div className="md:col-span-5 flex justify-center">
                  <div className="w-full border-4 border-black p-2 bg-black shadow-[10px_10px_0px_var(--guild-primary)] rotate-[-1deg] hover:rotate-0 transition-transform">
                    <img
                      src={currentEvent.coverImageUrl || "/assets/fest.jpeg"}
                      alt={currentEvent.title}
                      className="w-full aspect-[3/4] object-cover border-2 border-white max-h-[620px] bg-zinc-900"
                    />
                  </div>
                </div>

                {/* Event Dossier Details */}
                <div className="md:col-span-7 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="bg-red-600 text-white text-[10px] font-black uppercase px-3 py-1 border border-black shadow-[2px_2px_0px_#000] jagged-tag-event" style={{ fontFamily: F_MONO }}>
                        EP. 01 — OFFICIAL GATHERING
                      </span>
                      <span className="bg-black text-white text-[10px] font-black uppercase px-3 py-1" style={{ fontFamily: F_MONO }}>
                        {new Date(currentEvent.eventDateUtc).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
                      </span>
                    </div>

                    <h1 className="text-4xl sm:text-6xl md:text-7xl uppercase tracking-tighter leading-[0.88] mb-4" style={{ fontFamily: F_DISPLAY }}>
                      {currentEvent.title}
                    </h1>

                    {currentEvent.tagline && (
                      <p className="text-xs sm:text-sm font-black uppercase text-yellow-600 mb-3 bg-yellow-50 p-2 border border-black/10 inline-block" style={{ fontFamily: F_MONO }}>
                        ★ {currentEvent.tagline}
                      </p>
                    )}

                    <p className="text-xs sm:text-sm font-bold text-zinc-800 leading-relaxed mb-6 whitespace-pre-line" style={{ fontFamily: F_MONO }}>
                      {currentEvent.description}
                    </p>
                  </div>

                  <div className="border-t-4 border-black pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-black uppercase" style={{ fontFamily: F_MONO }}>
                    <div className="bg-[#e8e4d8] p-3 border-2 border-black">
                      <span className="text-[10px] text-zinc-500 block mb-0.5">LOCATION HUB</span>
                      <strong className="text-black text-sm block leading-tight">{currentEvent.locationName}</strong>
                    </div>
                    <div className="bg-[#e8e4d8] p-3 border-2 border-black">
                      <span className="text-[10px] text-zinc-500 block mb-0.5">VENUE ADDRESS</span>
                      <strong className="text-black text-sm block leading-tight">{currentEvent.venueAddress}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ADVANCE PRESALE VOUCHER RESERVATION BOX (HIDDEN ONCE PURCHASED) */}
            {currentEvent.presaleStage && !hasActivePresale && (
              <div className="ink-box-event bg-yellow-400 p-6 md:p-8 shadow-[8px_8px_0px_#000] relative overflow-hidden" style={{ fontFamily: F_MONO }}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                  <div className="max-w-2xl">
                    <span className="bg-black text-yellow-400 px-2.5 py-0.5 text-[9px] font-black uppercase inline-block mb-2 jagged-tag-event">
                      ADVANCE RESERVATION // NOT A GATE ENTRY TICKET
                    </span>
                    <h2 className="text-2xl sm:text-3xl uppercase font-black tracking-tight" style={{ fontFamily: F_DISPLAY }}>
                      {currentEvent.presaleStage.stageName}
                    </h2>
                    <p className="text-xs font-bold text-black mt-2 leading-relaxed">
                      Pay <strong className="underline">₦{currentEvent.presaleStage.basePrice.toLocaleString()}</strong> now via Paystack to lock in a guaranteed <strong className="underline">₦{currentEvent.presaleStage.presaleDiscountValue.toLocaleString()} discount</strong> deducted from your full admission pass when tier tickets drop.
                    </p>
                    <div className="text-[10px] text-zinc-800 uppercase font-black mt-2">
                      Cap: {currentEvent.presaleStage.remaining} / {currentEvent.presaleStage.totalCapacity} vouchers left
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenBuy(currentEvent.presaleStage)}
                    disabled={currentEvent.presaleStage.isSoldOut}
                    className={`px-6 py-3.5 font-black uppercase text-xs border-2 border-black transition-all shrink-0 shadow-[4px_4px_0px_#000] ${
                      currentEvent.presaleStage.isSoldOut
                        ? "bg-zinc-300 text-zinc-600 cursor-not-allowed"
                        : "bg-black text-white hover:bg-white hover:text-black active:translate-y-0.5 cursor-pointer"
                    }`}
                  >
                    {currentEvent.presaleStage.isSoldOut ? "Vouchers Exhausted" : `Secure Voucher (₦${currentEvent.presaleStage.basePrice.toLocaleString()})`}
                  </button>
                </div>
              </div>
            )}

            {/* PRESALE DISCOUNT ACTIVE BADGE (DISPLAYED ONCE ACTIVE VOUCHER HELD) */}
            {hasActivePresale && (
              <div className="ink-box-event bg-yellow-400 p-5 font-bold text-xs uppercase shadow-[6px_6px_0px_#000] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3" style={{ fontFamily: F_MONO }}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🏷</span>
                  <div>
                    <strong className="text-sm block">Presale Voucher Active (-₦{presaleDiscount.toLocaleString()})</strong>
                    <span className="text-[11px] text-zinc-900 font-medium">Your locked discount will automatically be deducted from your admission pass at checkout.</span>
                  </div>
                </div>
                <span className="bg-black text-white px-3 py-1 text-[10px] font-black uppercase shrink-0 jagged-tag-event">
                  DISCOUNT LOCKED
                </span>
              </div>
            )}

            {/* DYNAMIC ADMISSION PASS TIERS GRID */}
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b-4 border-black">
                <div>
                  <span className="text-xs font-bold uppercase text-zinc-500" style={{ fontFamily: F_MONO }}>OFFICIAL SECTOR ADMISSION</span>
                  <h2 className="text-3xl md:text-5xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
                    Admission Passes & Upgrades
                  </h2>
                </div>
                <span className="hidden sm:block text-2xl font-black text-red-600 rotate-[-3deg]" style={{ fontFamily: F_SFX }}>
                  CLAIM BEFORE CUTOFF!!
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {currentEvent.admissionStages?.map((stage: any) => {
                  const isHiddenPrice = stage.basePrice === null || stage.basePrice === undefined;
                  const finalCost = isHiddenPrice ? null : Math.max(0, stage.basePrice - presaleDiscount);

                  return (
                    <div
                      key={stage.id}
                      className={`ink-box-event bg-white p-6 shadow-[8px_8px_0px_#000] flex flex-col justify-between relative transition-all ${
                        stage.isSoldOut ? "opacity-60 bg-zinc-100" : isHiddenPrice ? "bg-zinc-50 border-dashed" : "hover:-translate-y-1 hover:shadow-[12px_12px_0px_#000]"
                      }`}
                    >
                      {stage.isSoldOut && (
                        <span className="absolute -top-3 right-4 bg-red-600 text-white border-2 border-black px-2.5 py-0.5 text-[9px] font-black uppercase jagged-tag-event" style={{ fontFamily: F_MONO }}>
                          SOLD OUT
                        </span>
                      )}

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase" style={{ fontFamily: F_MONO }}>
                            {stage.isSoldOut ? "0 Slots Left" : `${stage.remaining} Passes Left`}
                          </span>
                          <span className="text-[9px] font-black uppercase bg-zinc-200 text-zinc-700 px-1.5 py-0.5 border border-black/20" style={{ fontFamily: F_MONO }}>
                            {stage.stageType}
                          </span>
                        </div>

                        <h3 className="text-2xl uppercase font-black mb-3 leading-tight" style={{ fontFamily: F_DISPLAY }}>
                          {stage.stageName}
                        </h3>

                        {/* PRICE OR CONFIDENTIAL MASK CONTAINER */}
                        <div className="mb-6">
                          {isHiddenPrice ? (
                            <div className="redacted-bar text-white p-3 text-center border-2 border-black shadow-[3px_3px_0px_#000]">
                              <span className="text-xs font-black uppercase tracking-widest block" style={{ fontFamily: F_MONO }}>
                                TBA // CLASSIFIED
                              </span>
                              <span className="text-[9px] text-zinc-400 block mt-0.5">Price unseals on drop</span>
                            </div>
                          ) : (
                            <div>
                              {presaleDiscount > 0 && (
                                <span className="text-xs text-zinc-400 line-through block font-mono">
                                  ₦{stage.basePrice.toLocaleString()}
                                </span>
                              )}
                              <div className="text-4xl font-black text-black leading-none" style={{ fontFamily: F_DISPLAY }}>
                                ₦{finalCost!.toLocaleString()}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* TICKET ACTION BUTTON */}
                      <button
                        onClick={() => handleOpenBuy(stage)}
                        disabled={stage.isSoldOut || isHiddenPrice}
                        className={`w-full py-3.5 text-xs font-black uppercase border-2 border-black transition-all ${
                          stage.isSoldOut
                            ? "bg-zinc-300 text-zinc-600 cursor-not-allowed"
                            : isHiddenPrice
                            ? "bg-zinc-200 text-zinc-400 border-zinc-400 cursor-not-allowed"
                            : "bg-black text-white hover:bg-yellow-400 hover:text-black shadow-[4px_4px_0px_#000] active:translate-y-0.5 cursor-pointer"
                        }`}
                        style={{ fontFamily: F_MONO }}
                      >
                        {stage.isSoldOut
                          ? "Stage Closed // Sold Out"
                          : isHiddenPrice
                          ? "🔒 Tier Locked"
                          : "Pay & Authorize Pass (+100 QP) ➔"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SOCIAL HYPE & REELS SECTION */}
            {hypeReels.length > 0 && (
              <div className="ink-box-event bg-white p-6 md:p-8 shadow-[8px_8px_0px_#000]">
                <h3 className="text-2xl sm:text-3xl uppercase font-black mb-4" style={{ fontFamily: F_DISPLAY }}>
                  Operation Broadcasts & Teasers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hypeReels.map((reel: any, i: number) => (
                    <div key={i} className="border-2 border-black p-2.5 bg-[#e8e4d8] shadow-[3px_3px_0px_#000]">
                      {reel.type === "youtube" ? (
                        <iframe src={reel.url} title="Teaser" className="w-full aspect-video border border-black bg-black" allowFullScreen />
                      ) : (
                        <a href={reel.url} target="_blank" rel="noopener noreferrer" className="block text-xs font-bold uppercase p-4 bg-black text-white text-center hover:bg-yellow-400 hover:text-black transition-colors" style={{ fontFamily: F_MONO }}>
                          ▶ Open on {reel.type.toUpperCase()} ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CHECKOUT MODAL                                            */}
      {/* ========================================================= */}
      {selectedStage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="ink-box-event bg-[#e8e4d8] p-6 md:p-8 max-w-lg w-full shadow-[14px_14px_0px_#000] relative">
            <div className="flex justify-between items-center mb-4 pb-3 border-b-2 border-black">
              <h2 className="text-3xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
                Confirm Pass Order
              </h2>
              <button onClick={() => setSelectedStage(null)} className="font-bold text-xs bg-black text-white px-3 py-1 jagged-tag-event cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCompleteOrder} className="flex flex-col gap-3" style={{ fontFamily: F_MONO }}>
              <div className="border border-black p-3 bg-white">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Tier Selection</span>
                <div className="text-lg font-black uppercase">{selectedStage.stageName}</div>
                <div className="text-sm font-bold text-red-600">Base Price: ₦{selectedStage.basePrice.toLocaleString()}</div>
                {presaleDiscount > 0 && selectedStage.stageType !== "PresaleVoucher" && (
                  <div className="text-xs font-bold text-green-600">Presale Voucher Applied: -₦{presaleDiscount.toLocaleString()}</div>
                )}
                {selectedStage.stageType !== "PresaleVoucher" && presaleDiscount > 0 && (
                  <div className="text-xs font-black uppercase text-black border-t border-black/10 mt-1 pt-1">
                    Final Payable: ₦{Math.max(0, selectedStage.basePrice - presaleDiscount).toLocaleString()}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold uppercase block mb-1">Operative Name</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full p-2 border border-black text-xs font-bold bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase block mb-1">Transmission Email (QR Delivery)</label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full p-2 border border-black text-xs font-bold bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase block mb-1">Promo Coupon Code</label>
                <input
                  type="text"
                  placeholder="e.g. AZURE2026"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="w-full p-2 border border-black text-xs font-bold bg-white uppercase"
                />
              </div>

              {statusError && <span className="text-xs font-bold text-red-600">{statusError}</span>}

              <button
                type="submit"
                disabled={purchasing}
                className="bg-black text-white p-3.5 font-black uppercase text-sm border-2 border-black hover:bg-yellow-400 hover:text-black transition-colors mt-2 shadow-[4px_4px_0px_#000] cursor-pointer flex items-center justify-center gap-2"
                style={{ fontFamily: F_DISPLAY }}
              >
                {purchasing ? "Connecting Paystack Live Gateway..." : "Proceed to Paystack Payment ➔"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* POST-PURCHASE MODAL                                       */}
      {/* ========================================================= */}
      {purchaseResult && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-lg z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black p-6 md:p-8 max-w-md w-full shadow-[16px_16px_0px_#000] text-center relative ink-box-event">
            <span className="bg-black text-yellow-400 px-3 py-1 text-[10px] font-black uppercase tracking-widest inline-block mb-3" style={{ fontFamily: F_MONO }}>
              {purchaseResult.isPresale ? "ADVANCE VOUCHER LOCKED" : "OFFICIAL GATE PASS // CRYPTO SIGNED"}
            </span>

            <h2 className="text-3xl uppercase font-black mb-1" style={{ fontFamily: F_DISPLAY }}>
              {purchaseResult.eventTitle}
            </h2>
            <div className="text-xs text-zinc-500 font-bold uppercase mb-4" style={{ fontFamily: F_MONO }}>
              {purchaseResult.stageName} • Guest: {purchaseResult.guestName}
            </div>

            {purchaseResult.isPresale ? (
              <div className="p-6 border-4 border-black bg-yellow-400 mb-4 shadow-[6px_6px_0px_#000]" style={{ fontFamily: F_MONO }}>
                <span className="text-4xl block mb-2">🏷</span>
                <h3 className="text-xl font-black uppercase">Discount Locked: ₦{purchaseResult.discountLocked.toLocaleString()}</h3>
                <p className="text-xs font-bold text-black mt-2 leading-relaxed">
                  Your advance voucher is registered. When admission tiers drop, this discount will automatically be deducted.
                </p>
              </div>
            ) : (
              <div className="p-4 border-4 border-black bg-[#e8e4d8] inline-block mb-4 shadow-[6px_6px_0px_#000]">
                <QRCodeSVG value={purchaseResult.id} size={180} level="H" />
              </div>
            )}

            <button
              onClick={() => setPurchaseResult(null)}
              className="w-full bg-black text-white py-3 font-black uppercase text-xs border-2 border-black hover:bg-yellow-400 hover:text-black transition-colors cursor-pointer"
              style={{ fontFamily: F_DISPLAY }}
            >
              Dismiss & Return to Command
            </button>
          </div>
        </div>
      )}
    </div>
  );
}