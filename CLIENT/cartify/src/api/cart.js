const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export async function getCart(token) {
  const res = await fetch(`${API}/api/cart`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch cart");
  return res.json();
}

export async function addToCart(token, productId, quantity = 1) {
  const res = await fetch(`${API}/api/cart/add/${encodeURIComponent(productId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) throw new Error("Failed to add to cart");
  return res.json();
}

export async function updateCartItem(token, productId, quantity) {
  const res = await fetch(`${API}/api/cart/items/${encodeURIComponent(productId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) throw new Error("Failed to update cart item");
  return res.json();
}

export async function removeCartItem(token, productId) {
  const res = await fetch(`${API}/api/cart/items/${encodeURIComponent(productId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to remove cart item");
  return res.json();
}
