import {
  apiRequest,
} from "./client";

export function getProducts(
  filters = {},
  signal,
) {
  const parameters =
    new URLSearchParams();

  Object.entries(filters).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        parameters.set(key, value);
      }
    },
  );

  const query = parameters.toString();

  return apiRequest(
    `/products${query ? `?${query}` : ""}`,
    {
      signal,
    },
  );
}

export function getBestSellingProducts(
  signal,
) {
  return apiRequest(
    "/products/best-sellers",
    {
      signal,
    },
  );
}

export function getProductBySlug(
  slug,
  signal,
) {
  return apiRequest(
    `/products/${encodeURIComponent(slug)}`,
    {
      signal,
    },
  );
}

export function getCategories(signal) {
  return apiRequest(
    "/categories",
    {
      signal,
    },
  );
}