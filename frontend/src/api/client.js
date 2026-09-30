const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

const API_URL = (
  configuredApiUrl ||
  (import.meta.env.DEV ? "http://localhost:5000/api" : "/api")
).replace(/\/+$/, "");

export async function apiRequest(path, options = {}) {
  const headers = {
    ...options.headers,
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const requestPath = path.startsWith("/") ? path : `/${path}`;

  const response = await fetch(`${API_URL}${requestPath}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      data?.error || `Request failed with status ${response.status}`,
    );

    error.status = response.status;
    error.fields = data?.fields || {};

    throw error;
  }

  return data;
}