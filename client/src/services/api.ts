import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://otaku-s-domain.onrender.com/api';

export async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export const apiService = {
  async syncProfile() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/auth/sync`, {
      method: 'POST',
      headers
    });
    if (!res.ok) throw new Error('Failed to sync user profile with backend.');
    return res.json();
  },

  async getMyProfile() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers
    });
    if (!res.ok) throw new Error('Failed to fetch user profile.');
    return res.json();
  },

  async pledgeGuild(faction: 'Blue' | 'Red') {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/auth/pledge-guild`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ faction })
    });
    if (!res.ok) throw new Error('Failed to pledge guild.');
    return res.json();
  }
};

export const landingService = {
  async getSlides() {
    const res = await fetch(`${API_BASE_URL}/landing/slides`);
    if (!res.ok) throw new Error('Failed to fetch hero slides.');
    return res.json();
  },
  async getDailyTrial() {
    const res = await fetch(`${API_BASE_URL}/landing/daily-trial`);
    if (!res.ok) throw new Error('Failed to fetch daily trial.');
    return res.json();
  },
  async submitDailyTrial(answer: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/landing/submit-trial`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ answer })
    });
    return await res.json();
  }
};

export async function claimQuestPoints(
  activityType: "ANIME_INTERACT" | "MANGA_COMPLETE",
  mediaId: string,
  chapterId?: string
) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/quests/claim-activity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ activityType, mediaId, chapterId })
    });
    return await res.json();
  } catch (err) {
    console.error("Failed to claim QP:", err);
    return null;
  }
}

export async function updateOperativeHandle(payload: { username: string; displayName?: string; avatarUrl?: string }) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/auth/update-handle`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });
  return await res.json();
}