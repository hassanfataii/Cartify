const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

async function postJson(url, body, token) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

async function getJson(url, token) {
  const res = await fetch(url, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export async function login(payload) {
  return postJson(`${API}/api/auth/login`, payload);
}

export async function register(payload) {
  return postJson(`${API}/api/auth/register`, payload);
}

export async function me(token) {
  return getJson(`${API}/api/auth/me`, token);
}
