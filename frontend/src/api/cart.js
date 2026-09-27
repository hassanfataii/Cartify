import { apiRequest } from "./client";

export function getCart() {
  return apiRequest("/cart");
}

export function addItemToCart(productId, quantity = 1) {
  return apiRequest("/cart/items", {
    method: "POST",
    body: JSON.stringify({
      productId,
      quantity,
    }),
  });
}

export function updateCartItem(productId, quantity) {
  return apiRequest(`/cart/items/${productId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export function removeCartItem(productId) {
  return apiRequest(`/cart/items/${productId}`, {
    method: "DELETE",
  });
}

export function clearCart() {
  return apiRequest("/cart", {
    method: "DELETE",
  });
}