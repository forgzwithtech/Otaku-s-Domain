import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { fetchAllEvents, scanGatekeeperTicket } from "../../services/eventsApi";

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

export default function GatekeeperScanner() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<number>(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [loading, setLoading] = useState(false);

  // Verification & Screen Freeze State
  const [scanResult, setScanResult] = useState<any | null>(null);
  const isLockedRef = useRef(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const list = await fetchAllEvents();
        setEvents(list);
        if (list.length > 0) {
          setSelectedEventId(list[0].id);
        }
      } catch (err) {
        console.error("Failed to load events:", err);
      }
    }
    load();
  }, []);

  const activeEvent = events.find((e) => e.id === selectedEventId);

  const startCamera = async () => {
    if (!selectedEventId) {
      alert("Please select the target event first.");
      return;
    }

    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported or context is insecure.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        startScanningFrames();
      }
    } catch (err: any) {
      console.error(err);
      setCameraError(err.message || "Failed to start camera.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Frame Scanning Loop with Freeze Gate
  const startScanningFrames = () => {
    const hasBarcodeDetector = "BarcodeDetector" in window;
    let detector: any = null;

    if (hasBarcodeDetector) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ["qr_code", "code_128"] });
      } catch (e) {
        console.warn(e);
      }
    }

    const tick = async () => {
      if (isLockedRef.current) {
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      if (videoRef.current && videoRef.current.readyState >= 2 && detector) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            if (raw) {
              isLockedRef.current = true; // Instantly lock further detection
              handleVerifyPass(raw);
            }
          }
        } catch {
          // Ignore dropped frames
        }
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const handleVerifyPass = async (ticketPayload: string) => {
    if (!ticketPayload.trim() || !selectedEventId) return;

    let cleanTicketId = ticketPayload.trim();
    if (cleanTicketId.includes("pass=")) {
      cleanTicketId = cleanTicketId.split("pass=")[1].split("&")[0];
    } else if (cleanTicketId.startsWith("http")) {
      const parts = cleanTicketId.split("/");
      cleanTicketId = parts[parts.length - 1];
    }

    setLoading(true);
    setScanResult(null);
    setCameraError(null);

    try {
      const res = await scanGatekeeperTicket({
        ticketId: cleanTicketId,
        eventId: selectedEventId,
        requiredStageId: selectedStageId > 0 ? selectedStageId : undefined,
      });

      setScanResult(res);
      setManualCode("");

      if (navigator.vibrate) {
        navigator.vibrate(res.valid ? [100, 50, 100] : [300, 100, 300]);
      }
    } catch (err: any) {
      setScanResult({ valid: false, message: err.message || "Network gatekeeper error." });
    } finally {
      setLoading(false);
    }
  };

  const handleDismissScan = () => {
    setScanResult(null);
    isLockedRef.current = false; // Release lock for next scan
  };

  return (
    <div className="min-h-screen bg-[#070709] text-white p-4 sm:p-8 font-mono flex flex-col items-center justify-between relative overflow-hidden">
      {/* FULL-SCREEN IMMERSIVE FEEDBACK OVERLAY */}
      {scanResult && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in transition-all ${
            scanResult.valid
              ? "bg-emerald-950/95 shadow-[inset_0_0_120px_rgba(16,185,129,0.8)] border-8 border-emerald-500"
              : "bg-red-950/95 shadow-[inset_0_0_120px_rgba(239,68,68,0.8)] border-8 border-red-600"
          }`}
        >
          <div className="max-w-xl w-full bg-black/90 p-8 border-4 border-white shadow-[12px_12px_0px_#000] flex flex-col items-center gap-4">
            <span
              className={`text-6xl sm:text-7xl block animate-bounce ${
                scanResult.valid ? "text-emerald-400" : "text-red-500"
              }`}
            >
              {scanResult.valid ? "✔" : "✕"}
            </span>

            <span
              className={`px-4 py-1 text-xs font-black uppercase tracking-widest ${
                scanResult.valid ? "bg-emerald-500 text-black" : "bg-red-600 text-white"
              }`}
            >
              {scanResult.valid ? "ACCESS GRANTED" : "ACCESS REJECTED"}
            </span>

            <h2 className="text-3xl sm:text-5xl uppercase font-black tracking-tight" style={{ fontFamily: F_DISPLAY }}>
              {scanResult.guest || scanResult.message}
            </h2>

            {scanResult.valid && (
              <div className="w-full bg-zinc-900 border border-emerald-500/40 p-4 text-xs font-mono space-y-1.5 text-zinc-300 text-left">
                <p>🎟 <strong>PASS TIER:</strong> <span className="text-white">{scanResult.stage}</span></p>
                <p>🏟 <strong>EVENT:</strong> <span className="text-white">{scanResult.eventTitle}</span></p>
                <p>🛡 <strong>FACTION:</strong> <span className="text-white">{scanResult.faction}</span></p>
                <p>⏱ <strong>CHECKED IN AT:</strong> <span className="text-white">{new Date(scanResult.checkedInAt).toLocaleTimeString()}</span></p>
              </div>
            )}

            {!scanResult.valid && (
              <p className="text-sm font-bold text-red-300 bg-red-900/40 p-3 border border-red-500/50 w-full">
                {scanResult.message}
              </p>
            )}

            <button
              onClick={handleDismissScan}
              className={`w-full py-4 text-sm font-black uppercase tracking-widest transition-all cursor-pointer border-2 border-black shadow-[6px_6px_0px_#fff] hover:translate-y-1 hover:shadow-none ${
                scanResult.valid
                  ? "bg-emerald-500 hover:bg-emerald-400 text-black"
                  : "bg-white hover:bg-zinc-200 text-black"
              }`}
              style={{ fontFamily: F_DISPLAY }}
            >
              ✓ Confirm & Proceed to Next Guest ➔
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="w-full max-w-5xl flex justify-between items-center pb-6 border-b border-white/10">
        <div>
          <span className="text-[10px] uppercase font-bold text-rose-500 tracking-widest block">
            INTERPOOL GATE CLEARANCE TERMINAL
          </span>
          <h1 className="text-3xl sm:text-5xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
            Gatekeeper Terminal
          </h1>
        </div>

        <Link
          to="/interpool/mod"
          className="text-xs uppercase tracking-widest text-zinc-400 hover:text-white px-4 py-2 border border-white/10 rounded hover:bg-white/10 transition-colors"
        >
          ← Field Control
        </Link>
      </div>

      {/* Context Binding: Select Event & Tier Gate */}
      <div className="w-full max-w-5xl my-6 bg-zinc-950 border-2 border-white/20 p-5 shadow-[6px_6px_0px_#000]">
        <div className="text-xs font-bold uppercase text-zinc-400 mb-3 flex items-center gap-2">
          <span className="bg-rose-600 text-white px-2 py-0.5 text-[10px]">STEP 1</span>
          Select Active Gate Check-in Context
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
              1. Event Check-in Station:
            </label>
            <select
              value={selectedEventId || ""}
              onChange={(e) => {
                setSelectedEventId(Number(e.target.value));
                setSelectedStageId(0);
                setScanResult(null);
              }}
              className="w-full bg-[#111] border border-white/30 text-white text-xs font-bold p-3 uppercase focus:outline-none"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} ({new Date(evt.eventDateUtc).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
              2. Gate Tier Checkpoint (Anti-Pass Spoofing):
            </label>
            <select
              value={selectedStageId}
              onChange={(e) => {
                setSelectedStageId(Number(e.target.value));
                setScanResult(null);
              }}
              className="w-full bg-[#111] border border-white/30 text-white text-xs font-bold p-3 uppercase focus:outline-none"
            >
              <option value="0">All Tiers (General Gate Entry)</option>
              {activeEvent?.admissionStages?.map((s: any) => (
                <option key={s.id} value={s.id}>
                  Strict Gate: {s.stageName} (₦{s.basePrice ? s.basePrice.toLocaleString() : "VIP"})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Scanner & Manual Input */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-8 mb-8 items-start">
        {/* Viewfinder Lens */}
        <div className="md:col-span-6 flex flex-col items-center gap-4">
          <div className="relative w-full aspect-square max-w-[380px] bg-black border-4 border-black rounded-lg overflow-hidden flex items-center justify-center shadow-[10px_10px_0px_#000]">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
            />

            {!cameraActive && (
              <div className="flex flex-col items-center p-6 text-center gap-3">
                <span className="text-4xl">📷</span>
                <span className="text-xs text-zinc-400 uppercase font-bold">Camera Lens Offline</span>
                <button
                  onClick={startCamera}
                  className="px-6 py-3 bg-white text-black font-black uppercase text-xs hover:bg-rose-500 hover:text-white transition-all cursor-pointer border-2 border-black shadow-[4px_4px_0px_#000]"
                >
                  Activate Live Lens ➔
                </button>
              </div>
            )}

            {cameraActive && (
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-rose-500 m-8 rounded flex items-center justify-center">
                <div className="w-full h-0.5 bg-rose-500 animate-pulse" />
              </div>
            )}
          </div>

          {cameraActive && (
            <button
              onClick={stopCamera}
              className="text-xs uppercase font-bold text-zinc-400 hover:text-red-400 cursor-pointer"
            >
              ✕ Deactivate Camera
            </button>
          )}

          {cameraError && (
            <div className="p-3 bg-red-950 border border-red-500 text-red-300 text-xs text-center max-w-[380px]">
              {cameraError}
            </div>
          )}
        </div>

        {/* Manual Code Input */}
        <div className="md:col-span-6 flex flex-col gap-5 bg-zinc-950 border-2 border-white/20 p-6 shadow-[8px_8px_0px_#000]">
          <div>
            <span className="text-xs font-bold uppercase text-zinc-300 block mb-1">
              Manual Override / UUID Input
            </span>
            <p className="text-[11px] text-zinc-500 mb-3">
              Enter the ticket pass reference code if the camera cannot read the screen:
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              isLockedRef.current = true;
              handleVerifyPass(manualCode);
            }}
            className="flex flex-col gap-3"
          >
            <input
              type="text"
              placeholder="e.g. 7c9e6679-7425-40de-944b-e07fc1f90ae7"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full p-3 bg-black border border-white/20 text-xs font-bold text-white focus:border-rose-500 outline-none"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-widest transition-all cursor-pointer border-2 border-black shadow-[4px_4px_0px_#000]"
            >
              {loading ? "Authenticating Pass..." : "Verify Gate Entry ➔"}
            </button>
          </form>
        </div>
      </div>

      <div className="text-[10px] text-zinc-500 uppercase tracking-widest" style={{ fontFamily: F_MONO }}>
        Otaku's Domain Interpool Verification Grid • Anti-Pass Spoofing Active
      </div>
    </div>
  );
}