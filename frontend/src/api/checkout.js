import { apiRequest } from "./client";

export function createCheckoutSession(addressId) {
  return apiRequest("/checkout/session", {
    method: "POST",
    body: JSON.stringify({ addressId }),
  });
}
