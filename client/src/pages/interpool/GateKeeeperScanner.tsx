// client/src/pages/interpool/GateKeeeperScanner.tsx
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { fetchAllEvents, scanGatekeeperTicket } from "../../services/eventsApi";

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

export default function GatekeeperScanner() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<number | 0>(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 1. Load active events on mount
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

  // 2. Camera start/stop
  const startCamera = async () => {
    if (!selectedEventId) {
      alert("Please select the target event first.");
      return;
    }

    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported or insecure HTTP context.");
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

  // 3. Real-time Frame Decoding Loop
  const startScanningFrames = () => {
    const hasBarcodeDetector = "BarcodeDetector" in window;
    let detector: any = null;

    if (hasBarcodeDetector) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ["qr_code", "code_128"] });
      } catch (e) {
        console.warn("BarcodeDetector format initialization failed:", e);
      }
    }

    const tick = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      if (detector) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            if (raw && raw !== lastScannedCode) {
              setLastScannedCode(raw);
              handleVerifyPass(raw);
            }
          }
        } catch {
          // Frame drop safe
        }
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  };

  // 4. Context-bound ticket verification
  const handleVerifyPass = async (ticketPayload: string) => {
    if (!ticketPayload.trim() || !selectedEventId) return;

    // Sanitize in case QR contains full URL or JSON
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
      if (res.valid) {
        setManualCode("");
      }
    } catch (err: any) {
      setScanResult({ valid: false, message: err.message || "Network gatekeeper error." });
    } finally {
      setLoading(false);
      // Allow re-scanning next person after 3.5s cooldown
      setTimeout(() => {
        setLastScannedCode(null);
      }, 3500);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-white p-4 sm:p-8 font-mono flex flex-col items-center justify-between">
      <canvas ref={canvasRef} className="hidden" />

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

      {/* STEP 1: CONTEXT BINDING (Pick Event & Gate Tier) */}
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

      {/* STEP 2: SCANNER & VERIFICATION */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-8 mb-8 items-start">
        {/* Viewfinder Frame */}
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
                <span className="text-xs text-zinc-400 uppercase font-bold">
                  Camera Lens Offline
                </span>
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

        {/* Manual Input & Live Pass Telemetry */}
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

          {/* Validation Result Box */}
          {scanResult && (
            <div
              className={`p-5 border-2 text-xs flex flex-col gap-2 ${
                scanResult.valid
                  ? "bg-emerald-950/80 border-emerald-500 text-emerald-200"
                  : "bg-red-950/80 border-red-500 text-red-200"
              }`}
            >
              <div className="flex items-center justify-between font-black uppercase text-sm border-b border-white/20 pb-2">
                <span>{scanResult.valid ? "✔ CLEARANCE APPROVED" : "✕ ACCESS DENIED"}</span>
                {scanResult.alreadyCheckedIn && (
                  <span className="bg-red-600 text-white text-[9px] px-2 py-0.5">ALREADY USED</span>
                )}
              </div>

              <p className="font-bold text-base text-white">{scanResult.guest || scanResult.message}</p>

              {scanResult.valid && (
                <div className="text-[11px] space-y-1 text-zinc-300 pt-2 border-t border-emerald-500/30">
                  <p>🎟 Ticket Tier: <strong className="text-white">{scanResult.stage}</strong></p>
                  <p>🏟 Target Event: <strong className="text-white">{scanResult.eventTitle}</strong></p>
                  <p>🛡 Faction Alignment: <strong className="text-white">{scanResult.faction}</strong></p>
                  <p>⏱ Timestamp: <strong>{new Date(scanResult.checkedInAt).toLocaleTimeString()}</strong></p>
                </div>
              )}

              {!scanResult.valid && (
                <div className="text-[11px] text-red-300 pt-1">
                  Reason: <strong>{scanResult.message}</strong>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="text-[10px] text-zinc-500 uppercase tracking-widest" style={{ fontFamily: F_MONO }}>
        Otaku's Domain Interpool Verification Grid • Anti-Pass Spoofing Active
      </div>
    </div>
  );
}