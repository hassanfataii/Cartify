import { apiRequest } from "./client";

export function getAccount() {
  return apiRequest("/account");
}

export function updateAccountProfile(
  profile,
) {
  return apiRequest("/account/profile", {
    method: "PUT",
    body: JSON.stringify(profile),
  });
}

export function changeAccountPassword(
  passwords,
) {
  return apiRequest("/account/password", {
    method: "PUT",
    body: JSON.stringify(passwords),
  });
}

export function addAccountAddress(address) {
  return apiRequest("/account/addresses", {
    method: "POST",
    body: JSON.stringify(address),
  });
}

export function updateAccountAddress(
  addressId,
  address,
) {
  return apiRequest(
    `/account/addresses/${addressId}`,
    {
      method: "PUT",
      body: JSON.stringify(address),
    },
  );
}

export function deleteAccountAddress(
  addressId,
) {
  return apiRequest(
    `/account/addresses/${addressId}`,
    {
      method: "DELETE",
    },
  );
}