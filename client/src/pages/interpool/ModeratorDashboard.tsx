// src/pages/interpool/ModeratorDashboard.tsx
import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiService } from "../../services/api";
import { fetchAllEvents, scanGatekeeperTicket } from "../../services/eventsApi";
import StoreManager from "../../components/admin/StoreManager";
import TrialPipeline from "../../components/admin/TrialPipeline";
import RecruitmentQueue from "../../components/admin/RecruitmentQueue";

const F_DISPLAY = "'Anton', sans-serif";

export default function ModeratorDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"gatekeeper" | "store" | "trials" | "recruits">("gatekeeper");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userProfile, setUserProfile] = useState<any | null>(null);

  // Context-Aware Gate Check-in State
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<number>(0);
  const [ticketInput, setTicketInput] = useState("");
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyModClearance() {
      try {
        const profile = await apiService.getMyProfile();
        const role = profile?.role?.toLowerCase();
        if (role !== "admin" && role !== "moderator") {
          alert("Clearance level insufficient. Moderator permissions required.");
          navigate("/");
          return;
        }
        setUserProfile(profile);

        // Fetch live events for context selection
        const eventList = await fetchAllEvents();
        setEvents(eventList);
        if (eventList.length > 0) {
          setSelectedEventId(eventList[0].id);
        }
      } catch (err) {
        console.error("Mod clearance verification error:", err);
        navigate("/auth");
      } finally {
        setCheckingAuth(false);
      }
    }
    verifyModClearance();
  }, [navigate]);

  const activeEvent = events.find((e) => e.id === selectedEventId);

  const handleVerifyTicket = async (e: FormEvent) => {
    e.preventDefault();
    if (!ticketInput.trim() || !selectedEventId) {
      setScanError("Select an event before verifying passes.");
      return;
    }

    // Sanitize in case input contains a URL or query string
    let cleanTicketId = ticketInput.trim();
    if (cleanTicketId.includes("pass=")) {
      cleanTicketId = cleanTicketId.split("pass=")[1].split("&")[0];
    } else if (cleanTicketId.startsWith("http")) {
      const parts = cleanTicketId.split("/");
      cleanTicketId = parts[parts.length - 1];
    }

    setScanLoading(true);
    setScanResult(null);
    setScanError(null);

    try {
      const res = await scanGatekeeperTicket({
        ticketId: cleanTicketId,
        eventId: selectedEventId,
        requiredStageId: selectedStageId > 0 ? selectedStageId : undefined,
      });

      if (res.valid) {
        setScanResult(res);
        setTicketInput("");
      } else {
        setScanError(res.message || "Pass failed validation.");
      }
    } catch (err: any) {
      setScanError(err.message || "Network gatekeeper error.");
    } finally {
      setScanLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#e8e4d8] pt-36 text-center font-mono text-zinc-600 font-bold uppercase">
        ⚡ Verifying Field Officer Clearance...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e8e4d8] pt-24 pb-20 px-4 md:px-8 text-black font-mono">
      <div className="max-w-[100rem] mx-auto">
        {/* Header */}
        <div className="border-4 border-black bg-white p-6 md:p-8 shadow-[10px_10px_0px_#000] mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-black uppercase text-rose-600 tracking-widest block mb-1">
              FIELD DISPATCH // MODERATOR CLEARANCE
            </span>
            <h1 className="text-4xl sm:text-6xl uppercase tracking-tight font-black" style={{ fontFamily: F_DISPLAY }}>
              Interpool Field Control
            </h1>
            <span className="text-[11px] text-zinc-500 font-bold block mt-1">
              Officer: @{userProfile?.displayName || userProfile?.username} • Clearance: {userProfile?.role}
            </span>
          </div>

          <div className="flex gap-3">
            <Link
              to="/interpool/gatekeeper"
              className="bg-rose-600 text-white px-4 py-2.5 font-black uppercase text-xs border-2 border-black hover:bg-black transition-colors shadow-[2px_2px_0px_#000]"
            >
              📷 Open Camera Scanner
            </Link>
            <Link
              to="/dashboard"
              className="bg-black text-white px-4 py-2.5 font-black uppercase text-xs border-2 border-black hover:bg-yellow-400 hover:text-black transition-colors shadow-[2px_2px_0px_#000]"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab("gatekeeper")}
            className={`px-5 py-2.5 uppercase font-black text-xs border-2 border-black transition-all cursor-pointer ${
              activeTab === "gatekeeper" ? "bg-black text-white shadow-[4px_4px_0px_#000]" : "bg-white text-black hover:bg-zinc-200"
            }`}
          >
            🎟 Quick Gate Check-in
          </button>
          <button
            onClick={() => setActiveTab("store")}
            className={`px-5 py-2.5 uppercase font-black text-xs border-2 border-black transition-all cursor-pointer ${
              activeTab === "store" ? "bg-black text-white shadow-[4px_4px_0px_#000]" : "bg-white text-black hover:bg-zinc-200"
            }`}
          >
            🛍 Store & Akure Dispatch
          </button>
          <button
            onClick={() => setActiveTab("trials")}
            className={`px-5 py-2.5 uppercase font-black text-xs border-2 border-black transition-all cursor-pointer ${
              activeTab === "trials" ? "bg-black text-white shadow-[4px_4px_0px_#000]" : "bg-white text-black hover:bg-zinc-200"
            }`}
          >
            ⚔ Trivia & Daily Trials
          </button>
          <button
            onClick={() => setActiveTab("recruits")}
            className={`px-5 py-2.5 uppercase font-black text-xs border-2 border-black transition-all cursor-pointer ${
              activeTab === "recruits" ? "bg-black text-white shadow-[4px_4px_0px_#000]" : "bg-white text-black hover:bg-zinc-200"
            }`}
          >
            🎬 Casting Auditions
          </button>
        </div>

        {/* TAB 1: CONTEXT-BOUND GATE CHECK-IN */}
        {activeTab === "gatekeeper" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form
              onSubmit={handleVerifyTicket}
              className="lg:col-span-6 bg-white border-4 border-black p-6 shadow-[8px_8px_0px_#000] flex flex-col gap-4"
            >
              <div className="border-b-2 border-black pb-3">
                <span className="text-[10px] font-black uppercase text-zinc-500 block">STATION CONTEXT</span>
                <h3 className="text-2xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
                  Authorize Gate Admittance
                </h3>
              </div>

              {/* Event Context Selection */}
              <div>
                <label className="text-[10px] font-black uppercase block mb-1">Target Event</label>
                <select
                  value={selectedEventId || ""}
                  onChange={(e) => {
                    setSelectedEventId(Number(e.target.value));
                    setSelectedStageId(0);
                    setScanResult(null);
                    setScanError(null);
                  }}
                  className="w-full p-2.5 border-2 border-black text-xs font-bold bg-[#f8fafc] uppercase focus:outline-none"
                  required
                >
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} ({new Date(evt.eventDateUtc).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tier Gate Selection */}
              <div>
                <label className="text-[10px] font-black uppercase block mb-1">Gate Checkpoint Restriction</label>
                <select
                  value={selectedStageId}
                  onChange={(e) => {
                    setSelectedStageId(Number(e.target.value));
                    setScanResult(null);
                    setScanError(null);
                  }}
                  className="w-full p-2.5 border-2 border-black text-xs font-bold bg-[#f8fafc] uppercase focus:outline-none"
                >
                  <option value="0">All Tiers (General Access Gate)</option>
                  {activeEvent?.admissionStages?.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      Strict Gate: {s.stageName} (₦{s.basePrice ? s.basePrice.toLocaleString() : "VIP"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Ticket Input */}
              <div>
                <label className="text-[10px] font-black uppercase block mb-1">Ticket ID / Pass UUID</label>
                <input
                  type="text"
                  placeholder="e.g. 7c9e6679-7425-40de-944b-e07fc1f90ae7"
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                  className="w-full p-2.5 border-2 border-black text-xs font-bold bg-[#f8fafc] focus:outline-none focus:bg-white"
                  required
                />
              </div>

              {scanError && (
                <div className="p-3 bg-red-100 border-2 border-red-600 text-red-700 text-xs font-bold">
                  ❌ {scanError}
                </div>
              )}

              <button
                type="submit"
                disabled={scanLoading || !selectedEventId}
                className="w-full bg-black hover:bg-rose-600 text-white py-3.5 font-black uppercase text-xs tracking-wider transition-colors shadow-[4px_4px_0px_#000] cursor-pointer disabled:opacity-50"
              >
                {scanLoading ? "Verifying Interpool Ledger..." : "Authorize Entry ➔"}
              </button>
            </form>

            {/* Verification Result Display */}
            <div className="lg:col-span-6 border-4 border-black bg-white p-6 shadow-[8px_8px_0px_#000] flex flex-col justify-center">
              {scanResult ? (
                <div className="p-6 bg-green-50 border-3 border-green-600 text-green-950 flex flex-col gap-2">
                  <span className="bg-green-600 text-white px-2 py-0.5 text-[10px] font-black uppercase inline-block self-start">
                    ACCESS GRANTED // CLEARANCE VERIFIED
                  </span>
                  <h4 className="text-3xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
                    {scanResult.guest}
                  </h4>
                  <div className="text-xs font-bold space-y-1.5 mt-2 text-zinc-800 border-t border-green-300 pt-2">
                    <p>🎟 <strong>PASS TIER:</strong> {scanResult.stage}</p>
                    <p>🏟 <strong>EVENT:</strong> {scanResult.eventTitle}</p>
                    <p>🛡 <strong>FACTION:</strong> {scanResult.faction}</p>
                    <p>⏱ <strong>CHECKED IN AT:</strong> {new Date(scanResult.checkedInAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-zinc-500 text-xs uppercase font-bold flex flex-col items-center gap-2">
                  <span className="text-3xl">🛡</span>
                  <span>Gate terminal ready. Choose the event station and enter a UUID or URL to check in guests.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: STORE & DISPATCH */}
        {activeTab === "store" && <StoreManager />}

        {/* TAB 3: TRIVIA & TRIALS */}
        {activeTab === "trials" && <TrialPipeline />}

        {/* TAB 4: RECRUITMENT CASTING */}
        {activeTab === "recruits" && <RecruitmentQueue />}
      </div>
    </div>
  );
}