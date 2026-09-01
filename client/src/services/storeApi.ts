import { supabase } from "../lib/supabase";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5101/api";

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token || ""}`,
  };
}

export async function fetchStoreCatalog(categorySlug?: string) {
  const params = new URLSearchParams();
  if (categorySlug) params.append("categorySlug", categorySlug);

  const res = await fetch(`${API_BASE}/store/catalog?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load armor vault catalog.");
  return await res.json();
}

export async function fetchProductBySlug(slug: string) {
  const res = await fetch(`${API_BASE}/store/product/${slug}`);
  if (!res.ok) throw new Error("Failed to fetch product dossier.");
  return await res.json();
}

export async function checkoutStoreOrder(payload: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  akureZone: string;
  items: Array<{
    productId: number;
    selectedColor: string;
    selectedSize: string;
    quantity: number;
    customizationDetailsJson?: string;
  }>;
}) {
  const res = await fetch(`${API_BASE}/store/checkout`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });

  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const errText = await res.text();
    return { success: false, message: errText || `Server error (${res.status})` };
  }

  return await res.json();
}

// =========================================================================
// ADMIN STORE APIS
// =========================================================================

export async function saveAdminProduct(product: any) {
  const res = await fetch(`${API_BASE}/admin/store/products`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(product),
  });
  return await res.json();
}

export async function deleteAdminProduct(productId: number) {
  const res = await fetch(`${API_BASE}/admin/store/products/${productId}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  return await res.json();
}

export async function saveAdminVariant(variant: {
  id?: number;
  productId: number;
  colorName: string;
  colorHex: string;
  frontVariantImagesJson: string;
  backVariantImagesJson: string;
  additionalPrice?: number;
}) {
  const res = await fetch(`${API_BASE}/admin/store/variants`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(variant),
  });
  return await res.json();
}

export async function deleteAdminVariant(variantId: number) {
  const res = await fetch(`${API_BASE}/admin/store/variants/${variantId}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  return await res.json();
}

export async function sendAdminDispatchUpdate(payload: {
  orderId: string;
  statusHeadline: string;
  customNote: string;
  newOrderStatus?: string;
  riderContact?: string;
}) {
  const res = await fetch(`${API_BASE}/admin/store/orders/send-dispatch-update`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  return await res.json();
}