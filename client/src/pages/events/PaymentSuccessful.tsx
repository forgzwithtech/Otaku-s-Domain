import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import { verifyPaymentReference } from "../../services/eventsApi";

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("trxref");
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      if (!reference) {
        setError("Missing transaction reference.");
        setLoading(false);
        return;
      }
      try {
        const res = await verifyPaymentReference(reference);
        if (res.success) {
          setTicket(res);
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        } else {
          setError(res.message || "Payment verification pending.");
        }
      } catch (err: any) {
        setError(err.message || "Verification network error.");
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [reference]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e8e4d8] pt-36 text-center font-bold text-black uppercase" style={{ fontFamily: F_MONO }}>
        ⚡ Verifying Paystack Transaction with Interpool Ledger...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-[#e8e4d8] pt-32 px-4 flex justify-center items-center">
        <div className="bg-white border-4 border-black p-8 max-w-md w-full shadow-[10px_10px_0px_#000] text-center" style={{ fontFamily: F_MONO }}>
          <span className="text-4xl block mb-2">⚠️</span>
          <h2 className="text-2xl uppercase font-black mb-2" style={{ fontFamily: F_DISPLAY }}>Verification Alert</h2>
          <p className="text-xs font-bold text-red-600 mb-6">{error || "Could not resolve pass record."}</p>
          <Link to="/events" className="bg-black text-white px-6 py-2.5 uppercase font-bold text-xs border border-black hover:bg-yellow-400 hover:text-black">
            Return to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e8e4d8] pt-24 pb-20 px-4 flex items-center justify-center">
      <div className="bg-white border-4 border-black p-6 md:p-10 max-w-lg w-full shadow-[14px_14px_0px_#000] text-center" style={{ fontFamily: F_MONO }}>
        <span className="bg-black text-yellow-400 px-3 py-1 text-[10px] font-black uppercase tracking-widest inline-block mb-3">
          {ticket.isPresale ? "ADVANCE VOUCHER LOCKED" : "PASS AUTHORIZED // GATE TICKET"}
        </span>

        <h1 className="text-4xl uppercase font-black mb-1" style={{ fontFamily: F_DISPLAY }}>
          {ticket.eventTitle}
        </h1>
        <div className="text-xs text-zinc-500 font-bold uppercase mb-6">
          {ticket.stageName} • Guest: {ticket.guestName}
        </div>

        {ticket.isPresale ? (
          <div className="p-6 border-4 border-black bg-yellow-400 mb-6 shadow-[6px_6px_0px_#000]">
            <span className="text-5xl block mb-2">🏷</span>
            <h3 className="text-2xl font-black uppercase" style={{ fontFamily: F_DISPLAY }}>
              ₦{ticket.discountLocked.toLocaleString()} Discount Locked!
            </h3>
            <p className="text-xs font-bold text-black mt-2">
              Payment confirmed via Paystack. Your discount is linked to your operative account and will be deducted when you buy full admission passes.
            </p>
          </div>
        ) : (
          <div className="p-4 border-4 border-black bg-[#e8e4d8] inline-block mb-6 shadow-[6px_6px_0px_#000]">
            <QRCodeSVG value={ticket.ticketId} size={200} level="H" />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Link
            to="/events"
            className="w-full bg-black text-white py-3 font-black uppercase text-xs border-2 border-black hover:bg-yellow-400 hover:text-black transition-colors"
            style={{ fontFamily: F_DISPLAY }}
          >
            Return to Operations Hub ➔
          </Link>
        </div>
      </div>
    </div>
  );
}