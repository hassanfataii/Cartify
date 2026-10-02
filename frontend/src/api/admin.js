import {
  apiRequest,
} from "./client";

export function getAdminSummary() {
  return apiRequest(
    "/admin/summary",
  );
}

export function getAdminProducts(
  filters = {},
) {
  const parameters =
    new URLSearchParams();

  Object.entries(
    filters,
  ).forEach(
    ([key, value]) => {
      if (
        value !==
          undefined &&
        value !== null &&
        value !== ""
      ) {
        parameters.set(
          key,
          value,
        );
      }
    },
  );

  const query =
    parameters.toString();

  return apiRequest(
    `/admin/products${
      query
        ? `?${query}`
        : ""
    }`,
  );
}

export function getAdminOrders(
  page = 1,
  status = "",
) {
  const parameters =
    new URLSearchParams({
      page:
        String(page),

      limit:
        "20",
    });

  if (status) {
    parameters.set(
      "status",
      status,
    );
  }

  return apiRequest(
    `/admin/orders?${parameters.toString()}`,
  );
}

export function updateAdminOrderStatus(
  orderId,
  status,
) {
  return apiRequest(
    `/admin/orders/${orderId}/status`,
    {
      method:
        "PATCH",

      body:
        JSON.stringify({
          status,
        }),
    },
  );
}

export function createAdminProduct(
  product,
) {
  return apiRequest(
    "/admin/products",
    {
      method:
        "POST",

      body:
        JSON.stringify(
          product,
        ),
    },
  );
}

export function updateAdminProduct(
  productId,
  product,
) {
  return apiRequest(
    `/admin/products/${productId}`,
    {
      method:
        "PUT",

      body:
        JSON.stringify(
          product,
        ),
    },
  );
}

export function uploadAdminImages(
  files,
) {
  const formData =
    new FormData();

  files.forEach(
    (file) => {
      formData.append(
        "images",
        file,
      );
    },
  );

  return apiRequest(
    "/admin/uploads/images",
    {
      method:
        "POST",

      body:
        formData,
    },
  );
}

export function getAdminReturns(
  page = 1,
  status = "",
) {
  const parameters =
    new URLSearchParams({
      page:
        String(page),

      limit:
        "20",
    });

  if (status) {
    parameters.set(
      "status",
      status,
    );
  }

  return apiRequest(
    `/admin/returns?${parameters.toString()}`,
  );
}

export function updateAdminReturnStatus(
  returnId,
  status,
) {
  return apiRequest(
    `/admin/returns/${returnId}/status`,
    {
      method:
        "PATCH",

      body:
        JSON.stringify({
          status,
        }),
    },
  );
}