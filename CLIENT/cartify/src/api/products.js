import { get } from "./client";
export function fetchProducts({ categoryName } = {}) {
  const qs = categoryName ? `?categoryName=${encodeURIComponent(categoryName)}` : "";
  return get(`/api/products${qs}`);
}

export const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export function getProducts({ categoryName } = {}) {
  const qs = categoryName ? `?categoryName=${encodeURIComponent(categoryName)}` : "";
  return fetch(`${API}/api/products${qs}`).then(r => r.json());
}

export function getTrendingProducts({ days = 30, limit = 3 } = {}) {
  const qs = new URLSearchParams({ days, limit }).toString();
  return fetch(`${API}/api/products/trending?${qs}`).then(r => r.json());
}
