import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { scanGatekeeperTicket } from "../../services/eventsApi";

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

export default function GatekeeperScanner() {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported on this browser or origin (HTTPS / localhost required).");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(err.message || "Failed to obtain camera permission.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleVerifyPass = async (ticketId: string) => {
    if (!ticketId.trim()) return;
    setLoading(true);
    setScanResult(null);
    setCameraError(null);

    try {
      const res = await scanGatekeeperTicket(ticketId.trim());
      setScanResult(res);
      if (res.valid) {
        setManualCode("");
      }
    } catch (err: any) {
      setCameraError(err.message || "Network gatekeeper error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-4 sm:p-8 font-mono flex flex-col items-center justify-between">
      {/* Top Header */}
      <div className="w-full max-w-4xl flex justify-between items-center pb-6 border-b border-white/10">
        <div>
          <span className="text-[10px] uppercase font-bold text-rose-500 tracking-widest block">
            INTERPOOL TERMINAL // SCANNER CLEARANCE
          </span>
          <h1 className="text-3xl sm:text-5xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
            Gatekeeper Terminal
          </h1>
        </div>

        <Link
          to="/interpool/mod"
          className="text-xs uppercase tracking-widest text-zinc-400 hover:text-white px-4 py-2 border border-white/10 rounded-full hover:bg-white/10 transition-colors"
        >
          ← Field Control
        </Link>
      </div>

      {/* Main Scanner Section */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 my-8 items-center">
        {/* Left: Video Viewfinder */}
        <div className="md:col-span-7 flex flex-col items-center gap-4">
          <div className="relative w-full aspect-square max-w-[380px] bg-black border-2 border-white/20 rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
            />

            {!cameraActive && (
              <div className="flex flex-col items-center p-6 text-center gap-3">
                <span className="text-4xl">📷</span>
                <span className="text-xs text-zinc-400 uppercase font-bold">Camera is currently offline</span>
                <button
                  onClick={startCamera}
                  className="px-6 py-2.5 rounded-full bg-white text-black font-bold uppercase text-xs tracking-wider hover:bg-zinc-200 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                >
                  Request Camera Access ➔
                </button>
              </div>
            )}

            {/* Target Reticle Overlay */}
            {cameraActive && (
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-rose-500/50 m-8 rounded-xl flex items-center justify-center">
                <div className="w-full h-0.5 bg-rose-500/80 animate-pulse" />
              </div>
            )}
          </div>

          {cameraActive && (
            <button
              onClick={stopCamera}
              className="text-xs uppercase tracking-widest text-zinc-400 hover:text-red-400 font-bold"
            >
              Stop Camera
            </button>
          )}

          {cameraError && (
            <div className="p-3 bg-red-950/60 border border-red-500/40 text-red-400 text-xs text-center rounded-lg max-w-[380px]">
              {cameraError}
            </div>
          )}
        </div>

        {/* Right: Manual UUID Entry & Pass Dossier */}
        <div className="md:col-span-5 flex flex-col gap-5 bg-white/[0.02] border border-white/10 p-6 rounded-2xl">
          <div>
            <span className="text-xs font-bold uppercase text-zinc-400 block mb-1">
              Manual Ticket Entry
            </span>
            <p className="text-[11px] text-zinc-500 mb-3">
              If camera scanning is unavailable, paste or enter the Pass UUID:
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyPass(manualCode);
            }}
            className="flex flex-col gap-3"
          >
            <input
              type="text"
              placeholder="e.g. 7c9e6679-7425-40de-944b-e07fc1f90ae7"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full p-3 bg-black/60 border border-white/15 rounded-lg text-xs font-bold text-white focus:border-white outline-none"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-widest transition-all cursor-pointer shadow-[0_0_15px_rgba(225,29,72,0.3)]"
            >
              {loading ? "Checking Database..." : "Verify Pass ➔"}
            </button>
          </form>

          {/* Validation Result Box */}
          {scanResult && (
            <div
              className={`p-4 rounded-xl border text-xs flex flex-col gap-1.5 ${
                scanResult.valid
                  ? "bg-emerald-950/50 border-emerald-500/50 text-emerald-300"
                  : "bg-red-950/50 border-red-500/50 text-red-300"
              }`}
            >
              <div className="flex items-center gap-2 font-bold uppercase">
                <span>{scanResult.valid ? "✔ ACCESS GRANTED" : "✕ ACCESS DENIED"}</span>
              </div>
              <p className="font-bold text-sm text-white mt-1">{scanResult.guest || scanResult.message}</p>
              {scanResult.valid && (
                <div className="text-[11px] text-zinc-300 space-y-0.5 mt-1 pt-1 border-t border-emerald-500/20">
                  <p>🎟 Tier: <strong>{scanResult.stage}</strong></p>
                  <p>🏟 Event: <strong>{scanResult.eventTitle}</strong></p>
                  <p>🛡 Faction: <strong>{scanResult.faction}</strong></p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="text-[10px] text-zinc-600 uppercase tracking-widest">
        Otaku's Domain Interpool Verification Grid • Gate Terminal 1.0
      </div>
    </div>
  );
}