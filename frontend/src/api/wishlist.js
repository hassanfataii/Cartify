import { apiRequest } from "./client";

export function getWishlist() {
  return apiRequest("/wishlist");
}

export function addWishlistItem(productId) {
  return apiRequest("/wishlist/items", {
    method: "POST",
    body: JSON.stringify({ productId }),
  });
}

export function removeWishlistItem(productId) {
  return apiRequest(`/wishlist/items/${productId}`, {
    method: "DELETE",
  });
}