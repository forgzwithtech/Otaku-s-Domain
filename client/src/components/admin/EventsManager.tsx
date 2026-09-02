import { useState, useEffect, type FormEvent } from "react";
import { 
  fetchAllEvents, 
  fetchEventRoster, 
  fetchEventStats,
  saveAdminEvent, 
  deleteAdminEvent, 
  saveAdminStage, 
  deleteAdminStage 
} from "../../services/eventsApi";
import { uploadMediaAsset } from "../../services/storage";

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

export default function EventManager() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "stats" | "presale" | "stages" | "roster" | "media">("overview");

  // Telemetry & Roster
  const [roster, setRoster] = useState<any[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [eventStats, setEventStats] = useState<any | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Forms
  const [eventForm, setEventForm] = useState({
    id: 0,
    title: "",
    slug: "anime-convention",
    tagline: "",
    description: "",
    locationName: "Akure Tech Hub Center",
    venueAddress: "Alagbaka GRA, Akure, Ondo State",
    eventDateUtc: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
    coverImageUrl: "/assets/fest.jpeg",
    displayOrder: 0,
    isActive: true,
  });

  const [presaleForm, setPresaleForm] = useState({
    id: 0,
    basePrice: 1500,
    presaleDiscountValue: 3000,
    totalCapacity: 100,
    salesStartTimeUtc: new Date().toISOString().slice(0, 16),
    salesEndTimeUtc: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 16),
  });

  const [stageForm, setStageForm] = useState({
    id: 0,
    stageName: "Standard Admission",
    stageType: "Standard",
    basePrice: 5000,
    totalCapacity: 200,
    hidePriceUntilActive: false,
    salesStartTimeUtc: new Date().toISOString().slice(0, 16),
    salesEndTimeUtc: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
  });

  const [reels, setReels] = useState<Array<{ type: string; url: string; caption: string }>>([]);
  const [newReel, setNewReel] = useState({ type: "youtube", url: "", caption: "" });
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadEvents = async () => {
    try {
      const list = await fetchAllEvents();
      setEvents(list);
      if (list.length > 0) {
        const active = selectedEventId ? list.find((e: any) => e.id === selectedEventId) || list[0] : list[0];
        selectEvent(active);
      } else {
        setSelectedEventId(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const selectEvent = (evt: any) => {
    setSelectedEventId(evt.id);
    setEventForm({
      id: evt.id,
      title: evt.title,
      slug: evt.slug,
      tagline: evt.tagline || "",
      description: evt.description || "",
      locationName: evt.locationName || "",
      venueAddress: evt.venueAddress || "",
      eventDateUtc: new Date(evt.eventDateUtc).toISOString().slice(0, 16),
      coverImageUrl: evt.coverImageUrl || "/assets/fest.jpeg",
      displayOrder: evt.displayOrder || 0,
      isActive: evt.isActive,
    });

    if (evt.presaleStage) {
      setPresaleForm({
        id: evt.presaleStage.id,
        basePrice: evt.presaleStage.basePrice,
        presaleDiscountValue: evt.presaleStage.presaleDiscountValue,
        totalCapacity: evt.presaleStage.totalCapacity,
        salesStartTimeUtc: new Date(evt.presaleStage.salesStartTimeUtc || Date.now()).toISOString().slice(0, 16),
        salesEndTimeUtc: new Date(evt.presaleStage.salesEndTimeUtc).toISOString().slice(0, 16),
      });
    } else {
      setPresaleForm({
        id: 0,
        basePrice: 1500,
        presaleDiscountValue: 3000,
        totalCapacity: 100,
        salesStartTimeUtc: new Date().toISOString().slice(0, 16),
        salesEndTimeUtc: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 16),
      });
    }

    try {
      setReels(evt.mediaHypeReelsJson ? JSON.parse(evt.mediaHypeReelsJson) : []);
    } catch {
      setReels([]);
    }
  };

  const loadStatsData = async (eventId: number) => {
    setLoadingStats(true);
    try {
      const data = await fetchEventStats(eventId);
      setEventStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadRosterData = async (eventId: number) => {
    setLoadingRoster(true);
    try {
      const data = await fetchEventRoster(eventId);
      setRoster(data);
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      if (activeTab === "roster") loadRosterData(selectedEventId);
      if (activeTab === "stats") loadStatsData(selectedEventId);
    }
  }, [selectedEventId, activeTab]);

  const handleSaveEvent = async (e: FormEvent) => {
    e.preventDefault();
    await saveAdminEvent({
      ...eventForm,
      eventDateUtc: new Date(eventForm.eventDateUtc).toISOString(),
      mediaHypeReelsJson: JSON.stringify(reels),
    });
    alert("Event parameters saved.");
    loadEvents();
  };

  const handleDeleteCurrentEvent = async () => {
    if (!selectedEventId) return;
    if (confirm(`Strict Level 2 Admin Clearance: Delete "${eventForm.title}" and erase all associated passes and records?`)) {
      try {
        await deleteAdminEvent(selectedEventId);
        setSelectedEventId(null);
        loadEvents();
      } catch (err: any) {
        alert(err.message || "Failed to delete event. Admin role required.");
      }
    }
  };

  const handleSavePresale = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    await saveAdminStage({
      id: presaleForm.id > 0 ? presaleForm.id : undefined,
      eventId: selectedEventId,
      stageName: "Presale Voucher (Discount Locked)",
      stageType: "PresaleVoucher",
      basePrice: presaleForm.basePrice,
      presaleDiscountValue: presaleForm.presaleDiscountValue,
      totalCapacity: presaleForm.totalCapacity,
      hidePriceUntilActive: false,
      salesStartTimeUtc: new Date(presaleForm.salesStartTimeUtc).toISOString(),
      salesEndTimeUtc: new Date(presaleForm.salesEndTimeUtc).toISOString(),
      isActive: true,
    });
    alert("Presale Voucher rule saved.");
    loadEvents();
  };

  const handleSaveStage = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    await saveAdminStage({
      id: stageForm.id > 0 ? stageForm.id : undefined,
      eventId: selectedEventId,
      stageName: stageForm.stageName,
      stageType: stageForm.stageType,
      basePrice: stageForm.basePrice,
      presaleDiscountValue: 0,
      totalCapacity: stageForm.totalCapacity,
      hidePriceUntilActive: stageForm.hidePriceUntilActive,
      salesStartTimeUtc: new Date(stageForm.salesStartTimeUtc).toISOString(),
      salesEndTimeUtc: new Date(stageForm.salesEndTimeUtc).toISOString(),
      isActive: true,
    });
    setStageForm({
      id: 0,
      stageName: "Standard Admission",
      stageType: "Standard",
      basePrice: 5000,
      totalCapacity: 200,
      hidePriceUntilActive: false,
      salesStartTimeUtc: new Date().toISOString().slice(0, 16),
      salesEndTimeUtc: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
    });
    alert("Tier updated successfully.");
    loadEvents();
  };

  const handleDeleteStage = async (id: number) => {
    if (confirm("Decommission this admission tier?")) {
      await deleteAdminStage(id);
      loadEvents();
    }
  };

  const currentEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="border-4 border-black bg-white p-6 md:p-8 shadow-[10px_10px_0px_#000] mb-8">
      {/* Header */}
      <div className="mb-6 pb-4 border-b-2 border-black flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-zinc-500 uppercase" style={{ fontFamily: F_MONO }}>
            INTERPOOL LIVE SECTOR COMMAND
          </span>
          <h2 className="text-3xl md:text-4xl uppercase font-black" style={{ fontFamily: F_DISPLAY }}>
            Live Event & Ticketing Manager
          </h2>
        </div>

        <button
          onClick={() => {
            setSelectedEventId(0);
            setEventForm({
              id: 0,
              title: "Anime Watch Party 2.0",
              slug: "anime-watch-party-2",
              tagline: "",
              description: "",
              locationName: "Akure Tech Hub Center",
              venueAddress: "Alagbaka GRA, Akure",
              eventDateUtc: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 16),
              coverImageUrl: "/assets/fest.jpeg",
              displayOrder: 0,
              isActive: true,
            });
            setActiveTab("overview");
          }}
          className="bg-black text-white px-4 py-2.5 text-xs font-black uppercase border-2 border-black hover:bg-yellow-400 hover:text-black transition-colors cursor-pointer"
          style={{ fontFamily: F_MONO }}
        >
          + Add New Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Active Event Switcher */}
        <div className="lg:col-span-4 flex flex-col gap-3" style={{ fontFamily: F_MONO }}>
          <span className="text-xs uppercase font-bold text-zinc-500">Live & Scheduled Events ({events.length})</span>
          <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1">
            {events.map((evt) => {
              const isSelected = selectedEventId === evt.id;
              return (
                <button
                  key={evt.id}
                  onClick={() => selectEvent(evt)}
                  className={`p-3 text-left border-2 border-black text-xs font-bold transition-all flex justify-between items-center cursor-pointer ${
                    isSelected ? "bg-black text-white shadow-[4px_4px_0px_var(--guild-primary)]" : "bg-[#e8e4d8] hover:bg-zinc-200"
                  }`}
                >
                  <div className="truncate mr-2">
                    <div className="uppercase truncate">{evt.title}</div>
                    <span className="text-[10px] opacity-70 block font-mono">
                      Order: #{evt.displayOrder ?? 0} • {new Date(evt.eventDateUtc).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 uppercase border shrink-0 ${evt.isActive ? "bg-green-600 text-white" : "bg-zinc-400 text-black"}`}>
                    {evt.isActive ? "ACTIVE" : "DRAFT"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Tabbed Configuration */}
        <div className="lg:col-span-8 bg-[#e8e4d8] border-2 border-black p-5 shadow-[4px_4px_0px_#000]" style={{ fontFamily: F_MONO }}>
          <div className="flex flex-wrap gap-2 mb-6 border-b-2 border-black pb-3">
            {[
              { id: "overview", label: "1. Overview & Details" },
              { id: "stats", label: "📊 2. Live Event Telemetry" },
              { id: "presale", label: "3. Presale Voucher Rules" },
              { id: "stages", label: "4. Admission Tiers" },
              { id: "roster", label: "5. Guest Roster" },
              { id: "media", label: "6. Social Hype Media" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3 py-1.5 text-xs font-bold uppercase border border-black transition-colors cursor-pointer ${
                  activeTab === t.id ? "bg-black text-white" : "bg-white text-black hover:bg-zinc-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <form onSubmit={handleSaveEvent} className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Event Title"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="col-span-2 p-2 border border-black text-xs bg-white font-bold"
                  required
                />
                <div>
                  <input
                    type="number"
                    placeholder="Priority Order"
                    value={eventForm.displayOrder}
                    onChange={(e) => setEventForm({ ...eventForm, displayOrder: parseInt(e.target.value, 10) || 0 })}
                    className="w-full p-2 border border-black text-xs bg-white font-bold"
                    title="Lower numbers show first (e.g. 0, 1, 2)"
                  />
                  <span className="text-[9px] text-zinc-500 block">0 = Shows 1st</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="URL Slug"
                  value={eventForm.slug}
                  onChange={(e) => setEventForm({ ...eventForm, slug: e.target.value })}
                  className="p-2 border border-black text-xs bg-white"
                  required
                />
                <input
                  type="datetime-local"
                  value={eventForm.eventDateUtc}
                  onChange={(e) => setEventForm({ ...eventForm, eventDateUtc: e.target.value })}
                  className="p-2 border border-black text-xs bg-white"
                  required
                />
              </div>

              <textarea
                placeholder="Full Event Description..."
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                className="p-2 border border-black text-xs bg-white h-24 resize-none"
                required
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Location Name"
                  value={eventForm.locationName}
                  onChange={(e) => setEventForm({ ...eventForm, locationName: e.target.value })}
                  className="p-2 border border-black text-xs bg-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Street Venue Address"
                  value={eventForm.venueAddress}
                  onChange={(e) => setEventForm({ ...eventForm, venueAddress: e.target.value })}
                  className="p-2 border border-black text-xs bg-white"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={eventForm.isActive}
                  onChange={(e) => setEventForm({ ...eventForm, isActive: e.target.checked })}
                  className="w-4 h-4 border border-black"
                />
                <label htmlFor="isActive" className="text-xs font-bold uppercase cursor-pointer">Publish Event to Public Directory</label>
              </div>

              <div className="flex gap-2 mt-2">
                <button type="submit" className="flex-1 bg-black text-white p-2.5 uppercase font-bold text-xs hover:bg-yellow-400 hover:text-black cursor-pointer">
                  Save Event Configuration
                </button>
                {selectedEventId && selectedEventId > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteCurrentEvent}
                    className="bg-red-600 text-white px-4 py-2.5 uppercase font-bold text-xs hover:bg-red-700 cursor-pointer"
                  >
                    Delete Event ✕
                  </button>
                )}
              </div>
            </form>
          )}

          {/* TAB 2: LIVE TELEMETRY & BREAKDOWN STATS */}
          {activeTab === "stats" && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-black pb-2">
                <h4 className="font-bold text-sm uppercase">Live Attendance & Revenue Telemetry</h4>
                <button
                  onClick={() => selectedEventId && loadStatsData(selectedEventId)}
                  className="text-xs underline text-blue-600 cursor-pointer"
                >
                  Refresh Telemetry
                </button>
              </div>

              {loadingStats ? (
                <div className="text-center py-8 text-xs font-bold text-zinc-500 uppercase">⚡ Gathering event metrics...</div>
              ) : eventStats ? (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="bg-white border-2 border-black p-3">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Gate Passes Sold</span>
                      <span className="text-2xl font-black">{eventStats.totalAdmissionsSold}</span>
                      <span className="text-[9px] text-zinc-400 block font-mono">Real attendees</span>
                    </div>
                    <div className="bg-white border-2 border-black p-3">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Door Check-Ins</span>
                      <span className="text-2xl font-black text-green-600">{eventStats.checkedInCount}</span>
                      <span className="text-[9px] text-zinc-400 block font-mono">Cleared at door</span>
                    </div>
                    <div className="bg-white border-2 border-black p-3">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Presale Vouchers</span>
                      <span className="text-2xl font-black text-yellow-600">{eventStats.totalPresalesIssued}</span>
                      <span className="text-[9px] text-zinc-500 block font-mono">
                        {eventStats.pendingPresalesCount} pending upgrade
                      </span>
                    </div>
                    <div className="bg-white border-2 border-black p-3">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Total Revenue</span>
                      <span className="text-xl font-black text-zinc-900">₦{Number(eventStats.totalRevenue).toLocaleString()}</span>
                      <span className="text-[9px] text-zinc-400 block font-mono">Passes + Vouchers</span>
                    </div>
                  </div>

                  <div className="border-2 border-black bg-white p-4">
                    <span className="text-xs font-black uppercase block mb-3">Admission Tiers Breakdown</span>
                    <table className="w-full text-left text-xs">
                      <thead className="border-b-2 border-black text-[10px] uppercase text-zinc-500">
                        <tr>
                          <th className="pb-1">Tier Name</th>
                          <th className="pb-1">Base Price</th>
                          <th className="pb-1">Sold / Cap</th>
                          <th className="pb-1">Gate Check-ins</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {eventStats.tierBreakdown?.map((tier: any) => (
                          <tr key={tier.id}>
                            <td className="py-2 font-bold">{tier.stageName}</td>
                            <td className="py-2">₦{Number(tier.basePrice).toLocaleString()}</td>
                            <td className="py-2">{tier.sold} / {tier.totalCapacity}</td>
                            <td className="py-2 text-green-600 font-bold">{tier.checkedIn}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-xs font-bold text-zinc-500">No live telemetry recorded for this event.</div>
              )}
            </div>
          )}

          {/* TAB 3: PRESALE VOUCHER */}
          {activeTab === "presale" && (
            <form onSubmit={handleSavePresale} className="flex flex-col gap-4">
              <div className="border border-black p-3 bg-white">
                <h4 className="font-bold text-xs uppercase mb-1">Presale Voucher Architecture</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Operatives purchase a Presale Voucher in advance before tier ticket releases. Holding a voucher grants a locked discount deducted from whichever admission tier they purchase later.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold block mb-1">Voucher Price (Pay Now NGN)</label>
                  <input
                    type="number"
                    value={presaleForm.basePrice}
                    onChange={(e) => setPresaleForm({ ...presaleForm, basePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-black text-xs bg-white font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold block mb-1">Discount Granted (Off Final Ticket NGN)</label>
                  <input
                    type="number"
                    value={presaleForm.presaleDiscountValue}
                    onChange={(e) => setPresaleForm({ ...presaleForm, presaleDiscountValue: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-black text-xs bg-white font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold block mb-1">Max Voucher Capacity</label>
                  <input
                    type="number"
                    value={presaleForm.totalCapacity}
                    onChange={(e) => setPresaleForm({ ...presaleForm, totalCapacity: parseInt(e.target.value, 10) || 0 })}
                    className="w-full p-2 border border-black text-xs bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold block mb-1">Voucher Sales Cutoff (Date & Time)</label>
                  <input
                    type="datetime-local"
                    value={presaleForm.salesEndTimeUtc}
                    onChange={(e) => setPresaleForm({ ...presaleForm, salesEndTimeUtc: e.target.value })}
                    className="w-full p-2 border border-black text-xs bg-white"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="bg-black text-white p-2.5 uppercase font-bold text-xs hover:bg-yellow-400 hover:text-black cursor-pointer">
                Lock Presale Voucher Configuration
              </button>
            </form>
          )}

          {/* TAB 4: ADMISSION TIERS */}
          {activeTab === "stages" && (
            <div className="flex flex-col gap-4">
              <form onSubmit={handleSaveStage} className="bg-white p-4 border border-black flex flex-col gap-3">
                <span className="text-xs font-bold uppercase">{stageForm.id ? "Edit Admission Tier" : "+ Add Admission Tier"}</span>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Tier Name (e.g. VIP Backstage)"
                    value={stageForm.stageName}
                    onChange={(e) => setStageForm({ ...stageForm, stageName: e.target.value })}
                    className="p-1.5 border border-black text-xs font-bold"
                    required
                  />
                  <select
                    value={stageForm.stageType}
                    onChange={(e) => setStageForm({ ...stageForm, stageType: e.target.value })}
                    className="p-1.5 border border-black text-xs uppercase"
                  >
                    <option value="EarlyBird">Early Bird</option>
                    <option value="Standard">Standard Admission</option>
                    <option value="LateSurge">Late Surge</option>
                    <option value="VIPBackstage">VIP Backstage</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold block mb-0.5">Base Price (NGN)</label>
                    <input
                      type="number"
                      placeholder="Price"
                      value={stageForm.basePrice}
                      onChange={(e) => setStageForm({ ...stageForm, basePrice: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 border border-black text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold block mb-0.5">Capacity Cap</label>
                    <input
                      type="number"
                      placeholder="Cap"
                      value={stageForm.totalCapacity}
                      onChange={(e) => setStageForm({ ...stageForm, totalCapacity: parseInt(e.target.value, 10) || 0 })}
                      className="w-full p-1.5 border border-black text-xs font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold block mb-0.5">Sales Start (Date & Time)</label>
                    <input
                      type="datetime-local"
                      value={stageForm.salesStartTimeUtc}
                      onChange={(e) => setStageForm({ ...stageForm, salesStartTimeUtc: e.target.value })}
                      className="w-full p-1.5 border border-black text-xs bg-zinc-50"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold block mb-0.5">Sales Cutoff (Date & Time)</label>
                    <input
                      type="datetime-local"
                      value={stageForm.salesEndTimeUtc}
                      onChange={(e) => setStageForm({ ...stageForm, salesEndTimeUtc: e.target.value })}
                      className="w-full p-1.5 border border-black text-xs bg-zinc-50"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="checkbox"
                    id="hidePrice"
                    checked={stageForm.hidePriceUntilActive}
                    onChange={(e) => setStageForm({ ...stageForm, hidePriceUntilActive: e.target.checked })}
                    className="w-4 h-4 border border-black"
                  />
                  <label htmlFor="hidePrice" className="text-xs font-bold uppercase cursor-pointer">
                    Hide price from public until sales start ("??? Confidential")
                  </label>
                </div>

                <div className="flex gap-2 mt-2">
                  <button type="submit" className="flex-1 bg-black text-white p-2 text-xs font-bold uppercase hover:bg-yellow-400 hover:text-black cursor-pointer">
                    {stageForm.id ? "Update Tier" : "+ Add Tier"}
                  </button>
                  {stageForm.id > 0 && (
                    <button
                      type="button"
                      onClick={() => setStageForm({ id: 0, stageName: "Standard Admission", stageType: "Standard", basePrice: 5000, totalCapacity: 200, hidePriceUntilActive: false, salesStartTimeUtc: new Date().toISOString().slice(0, 16), salesEndTimeUtc: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16) })}
                      className="px-3 bg-zinc-300 text-xs font-bold uppercase cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {currentEvent?.admissionStages?.map((s: any) => (
                  <div key={s.id} className="bg-white p-3 border border-black flex justify-between items-center text-xs shadow-[2px_2px_0px_#000]">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm uppercase">{s.stageName}</strong>
                        {s.hidePriceUntilActive && (
                          <span className="bg-zinc-800 text-white text-[9px] px-1 py-0.2 uppercase font-mono">Price Masked</span>
                        )}
                        {s.isSoldOut && (
                          <span className="bg-red-600 text-white text-[9px] px-1 py-0.2 uppercase font-mono">Sold Out</span>
                        )}
                      </div>
                      <span className="text-zinc-600 block mt-0.5">
                        ₦{s.basePrice ? s.basePrice.toLocaleString() : "Confidential"} • {s.soldCount} Sold / {s.totalCapacity} Cap
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setStageForm({
                          id: s.id,
                          stageName: s.stageName,
                          stageType: s.stageType,
                          basePrice: s.basePrice || 5000,
                          totalCapacity: s.totalCapacity,
                          hidePriceUntilActive: s.hidePriceUntilActive || false,
                          salesStartTimeUtc: new Date(s.salesStartTimeUtc || Date.now()).toISOString().slice(0, 16),
                          salesEndTimeUtc: new Date(s.salesEndTimeUtc || Date.now() + 86400000).toISOString().slice(0, 16)
                        })}
                        className="px-2 py-1 bg-black text-white text-[10px] font-bold uppercase hover:bg-yellow-400 hover:text-black cursor-pointer"
                      >
                        Edit
                      </button>
                      <button onClick={() => handleDeleteStage(s.id)} className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold uppercase cursor-pointer">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: GUEST ROSTER */}
          {activeTab === "roster" && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase">Attendee Registry ({roster.length} Issued Passes)</span>
                <button onClick={() => selectedEventId && loadRosterData(selectedEventId)} className="text-xs text-blue-600 underline cursor-pointer">Refresh</button>
              </div>

              {loadingRoster ? (
                <div className="text-center py-8 text-xs font-bold text-zinc-500">Loading attendee records...</div>
              ) : roster.length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto border border-black bg-white">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-black text-white uppercase text-[9px]">
                      <tr>
                        <th className="p-2">Guest</th>
                        <th className="p-2">Pass Type</th>
                        <th className="p-2">Paid</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Gate Check-in</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((p) => (
                        <tr key={p.id} className="border-b border-zinc-200 hover:bg-zinc-50">
                          <td className="p-2">
                            <strong>{p.guestName}</strong>
                            <span className="block text-[9px] text-zinc-500">{p.guestEmail}</span>
                          </td>
                          <td className="p-2">
                            {p.stageName}
                            {p.isPresaleVoucher && <span className="block text-[8px] text-yellow-600 uppercase font-black">ADVANCE VOUCHER</span>}
                          </td>
                          <td className="p-2 font-bold">₦{p.purchaseAmount.toLocaleString()}</td>
                          <td className="p-2">
                            <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase ${p.status === "CheckedIn" ? "bg-green-600 text-white" : "bg-yellow-400 text-black"}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="p-2 text-[9px] text-zinc-500">
                            {p.checkedInAt ? `${new Date(p.checkedInAt).toLocaleTimeString()} (${p.checkedInByOfficer})` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-xs font-bold text-zinc-500 border border-black bg-white">No passes issued for this event yet.</div>
              )}
            </div>
          )}

          {/* TAB 6: MEDIA & SOCIAL HYPE */}
          {activeTab === "media" && (
            <div className="flex flex-col gap-4">
              <div className="border border-black p-3 bg-white">
                <span className="text-[10px] font-bold uppercase block mb-1">Upload Event Cover Artwork</span>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-black text-white px-3 py-1.5 text-xs font-black uppercase hover:bg-yellow-400 hover:text-black shrink-0">
                    {uploadingImage ? "Uploading..." : "📁 Upload Artwork"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setUploadingImage(true);
                        try {
                          const url = await uploadMediaAsset(f);
                          setEventForm((prev) => ({ ...prev, coverImageUrl: url }));
                        } finally {
                          setUploadingImage(false);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <input type="text" value={eventForm.coverImageUrl} onChange={(e) => setEventForm({ ...eventForm, coverImageUrl: e.target.value })} className="flex-1 p-1 text-xs border border-zinc-300" />
                </div>
              </div>

              <div className="border border-black p-3 bg-white">
                <span className="text-[10px] font-bold uppercase block mb-1">Add Social Video Reel (YouTube / TikTok / IG)</span>
                <div className="flex gap-2 mb-2">
                  <select value={newReel.type} onChange={(e) => setNewReel({ ...newReel, type: e.target.value })} className="p-1 border border-black text-xs">
                    <option value="youtube">YouTube</option>
                    <option value="tiktok">TikTok</option>
                    <option value="instagram">Instagram</option>
                  </select>
                  <input type="text" placeholder="Video URL" value={newReel.url} onChange={(e) => setNewReel({ ...newReel, url: e.target.value })} className="flex-1 p-1 border border-black text-xs" />
                  <button type="button" onClick={() => { if (newReel.url) { setReels([...reels, newReel]); setNewReel({ type: "youtube", url: "", caption: "" }); } }} className="bg-black text-white px-3 text-xs font-bold uppercase cursor-pointer">
                    + Add
                  </button>
                </div>

                {reels.map((r, i) => (
                  <div key={i} className="flex justify-between items-center text-[10px] bg-zinc-100 p-1 border mb-1">
                    <span className="truncate">{r.type.toUpperCase()}: {r.url}</span>
                    <button onClick={() => setReels(reels.filter((_, idx) => idx !== i))} className="text-red-600 font-bold px-1 cursor-pointer">✕</button>
                  </div>
                ))}
              </div>

              <button type="button" onClick={handleSaveEvent} className="bg-black text-white p-2.5 uppercase font-bold text-xs hover:bg-yellow-400 hover:text-black cursor-pointer">
                Save Media Updates
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}