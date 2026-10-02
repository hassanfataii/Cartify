import { apiRequest } from "./client";

export function registerAccount(credentials) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function loginAccount(credentials) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function logoutAccount() {
  return apiRequest("/auth/logout", {
    method: "POST",
  });
}

export function getCurrentUser() {
  return apiRequest("/auth/me", {
    retryOnNetworkError: true,
  });
}

export function requestPasswordReset(email) {
  return apiRequest("/auth/forgot-password", {
    method: "POST",

    body: JSON.stringify({
      email,
    }),
  });
}

export function resetAccountPassword({
  token,
  password,
}) {
  return apiRequest("/auth/reset-password", {
    method: "POST",

    body: JSON.stringify({
      token,
      password,
    }),
  });
}

export function loginWithGoogle(credential) {
  return apiRequest("/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
}