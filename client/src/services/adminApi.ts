import { supabase } from "../lib/supabase";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://otaku-s-domain.onrender.com/api";

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token || ""}`,
  };
}

// 1. Telemetry & Metrics
export async function fetchAdminTelemetry() {
  const res = await fetch(`${API_BASE}/admin/telemetry`, { headers: await authHeaders() });
  return await res.json();
}

// 2. Birthday Spotlight
export async function fetchBirthdayChampion() {
  const res = await fetch(`${API_BASE}/admin/birthday-spotlight`);
  return await res.json();
}

// 3. Users & Operative Dossiers
export async function fetchAdminUsers(params: { search?: string; faction?: string; role?: string; page?: number }) {
  const q = new URLSearchParams({
    search: params.search || "",
    faction: params.faction || "",
    role: params.role || "",
    page: (params.page || 1).toString(),
  });
  const res = await fetch(`${API_BASE}/admin/users?${q.toString()}`, { headers: await authHeaders() });
  return await res.json();
}

export async function updateUserDossier(
  id: string,
  payload: { role?: string; faction?: string; questPointsDelta?: number; eventCreditsDelta?: number }
) {
  const res = await fetch(`${API_BASE}/admin/users/${id}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// 4. Landing Slides (Full CRUD)
export async function fetchAdminSlides() {
  const res = await fetch(`${API_BASE}/admin/slides`, { headers: await authHeaders() });
  return await res.json();
}

export async function saveAdminSlide(slide: {
  id?: number;
  panel: string;
  tag?: string;
  stamp?: string;
  sfx?: string;
  title1: string;
  title2: string;
  kanji?: string;
  desc: string;
  btnText: string;
  imageUrl: string;
  memberName?: string;
  memberAvatar?: string;
  memberQuote?: string;
  displayOrder: number;
}) {
  const isEdit = Boolean(slide.id);
  const url = isEdit ? `${API_BASE}/admin/slides/${slide.id}` : `${API_BASE}/admin/slides`;
  const res = await fetch(url, {
    method: isEdit ? "PUT" : "POST",
    headers: await authHeaders(),
    body: JSON.stringify(slide),
  });
  return await res.json();
}

export async function deleteAdminSlide(id: number) {
  const res = await fetch(`${API_BASE}/admin/slides/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  return await res.json();
}

// 5. Daily Trials & Trivia Schedule (Full CRUD)
export async function fetchAdminTrials(page = 1) {
  const res = await fetch(`${API_BASE}/admin/daily-trials?page=${page}`, { headers: await authHeaders() });
  return await res.json();
}

export async function saveAdminTrial(trial: {
  id?: number;
  question: string;
  correctAnswer: string;
  rewardPoints: number;
  activeDate: string;
}) {
  const res = await fetch(`${API_BASE}/admin/daily-trials`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(trial),
  });
  return await res.json();
}

// Alias export for scheduleDailyTrial to maintain backward compatibility
export const scheduleDailyTrial = saveAdminTrial;

export async function deleteAdminTrial(id: number) {
  const res = await fetch(`${API_BASE}/admin/daily-trials/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  return await res.json();
}

// 6. Sponsors & Commercial Partners (Full CRUD)
export async function fetchAdminSponsors() {
  const res = await fetch(`${API_BASE}/admin/sponsors`, { headers: await authHeaders() });
  return await res.json();
}

export async function saveAdminSponsor(sponsor: {
  id?: number;
  name: string;
  role: string;
  websiteUrl: string;
  displayOrder: number;
}) {
  const isEdit = Boolean(sponsor.id);
  const url = isEdit ? `${API_BASE}/admin/sponsors/${sponsor.id}` : `${API_BASE}/admin/sponsors`;
  const res = await fetch(url, {
    method: isEdit ? "PUT" : "POST",
    headers: await authHeaders(),
    body: JSON.stringify(sponsor),
  });
  return await res.json();
}

export async function deleteAdminSponsor(id: number) {
  const res = await fetch(`${API_BASE}/admin/sponsors/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  return await res.json();
}

// 7. Recruitment Casting Pipeline
export async function fetchRecruits() {
  const res = await fetch(`${API_BASE}/admin/recruits`, { headers: await authHeaders() });
  return await res.json();
}

export async function deleteRecruit(id: number) {
  const res = await fetch(`${API_BASE}/admin/recruits/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  return await res.json();
}