// client/src/services/forumApi.ts
import { supabase } from "../lib/supabase";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://otaku-s-domain.onrender.com/api";

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token || ""}`,
  };
}

export async function setOperativeGender(gender: string) {
  const res = await fetch(`${API_BASE}/forum/set-gender`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ gender }),
  });
  return await res.json();
}

export async function fetchForumCategories() {
  const res = await fetch(`${API_BASE}/forum/categories`);
  return await res.json();
}

export async function fetchForumThreads(params: { categoryId?: number; mediaType?: string; search?: string; page?: number }) {
  const q = new URLSearchParams({
    categoryId: params.categoryId ? params.categoryId.toString() : "",
    mediaType: params.mediaType || "",
    search: params.search || "",
    page: (params.page || 1).toString(),
  });
  const res = await fetch(`${API_BASE}/forum/threads?${q.toString()}`, {
    headers: await authHeaders(),
  });
  return await res.json();
}

export async function fetchThreadDetails(id: number) {
  const res = await fetch(`${API_BASE}/forum/threads/${id}`, {
    headers: await authHeaders(),
  });
  return await res.json();
}

export async function createForumThread(payload: {
  categoryId: number;
  title: string;
  content: string;
  imageUrl?: string;
  mediaId?: number;
  mediaType?: string;
  mediaTitle?: string;
  mediaCoverUrl?: string;
  mediaScore?: number;
  repostOfThreadId?: number;
  isQuoteRepost?: boolean;
}) {
  const res = await fetch(`${API_BASE}/forum/threads`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  return await res.json();
}

export async function toggleThreadLike(threadId: number) {
  const res = await fetch(`${API_BASE}/forum/threads/${threadId}/like`, {
    method: "POST",
    headers: await authHeaders(),
  });
  return await res.json();
}

export async function toggleRepost(threadId: number) {
  const res = await fetch(`${API_BASE}/forum/threads/${threadId}/repost`, {
    method: "POST",
    headers: await authHeaders(),
  });
  return await res.json();
}

export async function postThreadComment(threadId: number, content: string, parentCommentId?: number) {
  const res = await fetch(`${API_BASE}/forum/threads/${threadId}/comments`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ content, parentCommentId }),
  });
  return await res.json();
}

export async function toggleCommentLike(commentId: number) {
  const res = await fetch(`${API_BASE}/forum/comments/${commentId}/like`, {
    method: "POST",
    headers: await authHeaders(),
  });
  return await res.json();
}

export async function fetchNotifications() {
  const res = await fetch(`${API_BASE}/forum/notifications`, {
    headers: await authHeaders(),
  });
  return await res.json();
}

export async function markNotificationsAsRead() {
  const res = await fetch(`${API_BASE}/forum/notifications/mark-read`, {
    method: "POST",
    headers: await authHeaders(),
  });
  return await res.json();
}

export async function fetchOperativeProfile(username: string) {
  const res = await fetch(`${API_BASE}/forum/profile/${encodeURIComponent(username)}`);
  return await res.json();
}