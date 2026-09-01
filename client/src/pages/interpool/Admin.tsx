import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchAdminTelemetry } from "../../services/adminApi";
import AdminTelemetry from "../../components/admin/AdminTelemetry";
import UserManagement from "../../components/admin/UserManagement";
import SlideManager from "../../components/admin/SlideManager";
import TrialPipeline from "../../components/admin/TrialPipeline";
import SponsorManager from "../../components/admin/SponsorsManager";
import RecruitmentQueue from "../../components/admin/RecruitmentQueue";
import EventManager from "../../components/admin/EventsManager";
import StoreManager from "../../components/admin/StoreManager";

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

export default function AdminDashboard() {
  const [telemetry, setTelemetry] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"users" | "events" | "merch" | "slides" | "trials" | "sponsors" | "recruits">("users");

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAdminTelemetry();
        setTelemetry(data);
      } catch (err) {
        console.error("Failed to load telemetry:", err);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#e8e4d8] pt-24 pb-20 px-4 md:px-8 text-black">
      <div className="max-w-[100rem] mx-auto">
        {/* Header */}
        <div className="border-4 border-black bg-white p-6 md:p-10 shadow-[12px_12px_0px_#000] mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs uppercase font-bold text-zinc-500 block mb-1 tracking-widest" style={{ fontFamily: F_MONO }}>
              INTERPOOL COMMAND CENTER // LEVEL 2 OVERRIDE
            </span>
            <h1 className="text-5xl md:text-7xl uppercase tracking-tight" style={{ fontFamily: F_DISPLAY }}>
              Interpool Master Admin
            </h1>
          </div>

          <Link
            to="/vault"
            className="bg-black text-white px-5 py-2.5 font-black uppercase text-xs border-2 border-black hover:bg-white hover:text-black transition-colors"
            style={{ fontFamily: F_MONO }}
          >
            ← Exit to Grand Vault
          </Link>
        </div>

        {/* Global Telemetry */}
        <AdminTelemetry stats={telemetry} />

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-6 py-2.5 uppercase font-black text-sm border-2 border-black transition-all ${
              activeTab === "users" ? "bg-black text-white shadow-[4px_4px_0px_#000]" : "bg-white text-black hover:bg-zinc-200"
            }`}
            style={{ fontFamily: F_DISPLAY }}
          >
            👥 Operatives & Users
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`px-6 py-2.5 uppercase font-black text-sm border-2 border-black transition-all ${
              activeTab === "events" ? "bg-black text-white shadow-[4px_4px_0px_#000]" : "bg-white text-black hover:bg-zinc-200"
            }`}
            style={{ fontFamily: F_DISPLAY }}
          >
            🎟 Live Events & Tickets
          </button>
          <button
            onClick={() => setActiveTab("merch")}
            className={`px-6 py-2.5 uppercase font-black text-sm border-2 border-black transition-all ${
              activeTab === "merch" ? "bg-black text-white shadow-[4px_4px_0px_#000]" : "bg-white text-black hover:bg-zinc-200"
            }`}
            style={{ fontFamily: F_DISPLAY }}
          >
            🛍 Store & Dispatch
          </button>
          <button
            onClick={() => setActiveTab("slides")}
            className={`px-6 py-2.5 uppercase font-black text-sm border-2 border-black transition-all ${
              activeTab === "slides" ? "bg-black text-white shadow-[4px_4px_0px_#000]" : "bg-white text-black hover:bg-zinc-200"
            }`}
            style={{ fontFamily: F_DISPLAY }}
          >
            🎞 Carousel Slides
          </button>
          <button
            onClick={() => setActiveTab("trials")}
            className={`px-6 py-2.5 uppercase font-black text-sm border-2 border-black transition-all ${
              activeTab === "trials" ? "bg-black text-white shadow-[4px_4px_0px_#000]" : "bg-white text-black hover:bg-zinc-200"
            }`}
            style={{ fontFamily: F_DISPLAY }}
          >
            ⚔ Daily Trials Pipeline
          </button>
          <button
            onClick={() => setActiveTab("sponsors")}
            className={`px-6 py-2.5 uppercase font-black text-sm border-2 border-black transition-all ${
              activeTab === "sponsors" ? "bg-black text-white shadow-[4px_4px_0px_#000]" : "bg-white text-black hover:bg-zinc-200"
            }`}
            style={{ fontFamily: F_DISPLAY }}
          >
            🤝 Sponsors & Brands
          </button>
          <button
            onClick={() => setActiveTab("recruits")}
            className={`px-6 py-2.5 uppercase font-black text-sm border-2 border-black transition-all ${
              activeTab === "recruits" ? "bg-black text-white shadow-[4px_4px_0px_#000]" : "bg-white text-black hover:bg-zinc-200"
            }`}
            style={{ fontFamily: F_DISPLAY }}
          >
            🎬 Casting Queue
          </button>
        </div>

        {/* Tab Modules */}
        {activeTab === "users" && <UserManagement />}
        {activeTab === "events" && <EventManager />}
        {activeTab === "merch" && <StoreManager />}
        {activeTab === "slides" && <SlideManager />}
        {activeTab === "trials" && <TrialPipeline />}
        {activeTab === "sponsors" && <SponsorManager />}
        {activeTab === "recruits" && <RecruitmentQueue />}
      </div>
    </div>
  );
}