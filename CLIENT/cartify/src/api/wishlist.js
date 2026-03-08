import { toId } from "../utils/toId";
export const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export async function getWishlist(token) {
  const res = await fetch(`${API}/api/wishlist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function addToWishlist(productId, token) {
  const id = toId(productId);
  const res = await fetch(`${API}/api/wishlist/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await res.json().catch(() => ({ error: "Failed" }));
}

export async function removeFromWishlist(productId, token) {
  const id = toId(productId);
  const res = await fetch(`${API}/api/wishlist/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await res.json().catch(() => ({ error: "Failed" }));
}
