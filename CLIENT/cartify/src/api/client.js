export const API = process.env.REACT_APP_API_URL || "http://localhost:5000";
export async function get(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
  return res.json();
}
