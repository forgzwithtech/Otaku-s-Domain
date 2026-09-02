import { supabase } from "../lib/supabase";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://otaku-s-domain.onrender.com/api";

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token || ""}`,
  };
}

export async function fetchAllEvents() {
  const res = await fetch(`${API_BASE}/events`);
  if (!res.ok) throw new Error("Failed to load events.");
  return await res.json();
}

export async function fetchPresaleStatus(eventId: number) {
  const res = await fetch(`${API_BASE}/events/my-presale-status?eventId=${eventId}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) return { hasPresaleDiscount: false, discountAmount: 0 };
  return await res.json();
}

export async function initializeTicketPayment(payload: {
  stageId: number;
  couponCode?: string;
  guestName: string;
  guestEmail: string;
}) {
  const res = await fetch(`${API_BASE}/payments/initialize-ticket`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });

  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const errorText = await res.text();
    console.error("Backend Server Error:", errorText);
    return { success: false, message: errorText || `Server responded with ${res.status}` };
  }

  return await res.json();
}

// Verify Paystack Payment on Return
export async function verifyPaymentReference(reference: string) {
  const res = await fetch(`${API_BASE}/payments/verify?reference=${encodeURIComponent(reference)}`, {
    headers: await authHeaders(),
  });
  return await res.json();
}

// Gatekeeper Verification
export async function scanGatekeeperTicket(params: {
  ticketId: string;
  eventId: number;
  requiredStageId?: number;
}) {
  const res = await fetch(`${API_BASE}/events/gatekeeper-scan`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      ticketId: params.ticketId,
      eventId: params.eventId,
      requiredStageId: params.requiredStageId || null,
    }),
  });
  return await res.json();
}

// Live Telemetry & Event Analytics
export async function fetchEventStats(eventId: number) {
  const res = await fetch(`${API_BASE}/admin/events/${eventId}/stats`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Failed to load event statistics.");
  }
  return await res.json();
}

// Admin APIs
export async function fetchEventRoster(eventId: number) {
  const res = await fetch(`${API_BASE}/admin/events/${eventId}/roster`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Failed to load attendee roster.");
  }
  return await res.json();
}

export async function saveAdminEvent(evt: any) {
  const res = await fetch(`${API_BASE}/admin/events`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(evt),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Failed to save event.");
  }
  return await res.json();
}

export async function deleteAdminEvent(eventId: number) {
  const res = await fetch(`${API_BASE}/admin/events/${eventId}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Strict Level 2 Admin clearance required to delete events.");
  }
  return await res.json();
}

export async function saveAdminStage(stage: any) {
  const res = await fetch(`${API_BASE}/admin/events/stages`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(stage),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Failed to save stage tier.");
  }
  return await res.json();
}

export async function deleteAdminStage(stageId: number) {
  const res = await fetch(`${API_BASE}/admin/events/stages/${stageId}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Failed to delete stage tier.");
  }
  return await res.json();
}