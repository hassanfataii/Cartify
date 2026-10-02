import {
  apiRequest,
} from "./client";

export function getOrders(
  page = 1,
  {
    search = "",
    sort = "newest",
  } = {},
) {
  const params =
    new URLSearchParams({
      page: String(page),
      limit: "10",
      sort,
    });

  if (search.trim()) {
    params.set(
      "search",
      search.trim(),
    );
  }

  return apiRequest(
    `/orders?${params.toString()}`,
  );
}

export function getOrderById(
  orderId,
) {
  return apiRequest(
    `/orders/${orderId}`,
  );
}

export function getOrderReturns(
  orderId,
) {
  return apiRequest(
    `/orders/${orderId}/returns`,
  );
}

export function createReturnRequest(
  orderId,
  payload,
) {
  return apiRequest(
    `/orders/${orderId}/returns`,
    {
      method: "POST",

      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}