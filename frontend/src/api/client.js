const configuredApiUrl =
  import.meta.env.VITE_API_URL?.trim();

const API_URL = (
  configuredApiUrl ||
  (
    import.meta.env.DEV
      ? "http://localhost:5000/api"
      : "/api"
  )
).replace(/\/+$/, "");

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(
      resolve,
      milliseconds,
    );
  });
}

function isAbortError(error) {
  return (
    error?.name === "AbortError"
  );
}

function createNetworkError(cause) {
  const error = new Error(
    "Cannot reach the Cartify API. Make sure the backend is running and try again.",
  );

  error.code =
    "NETWORK_ERROR";

  error.cause =
    cause;

  return error;
}

export async function apiRequest(
  path,
  options = {},
) {
  const {
    retryOnNetworkError = false,
    retryDelayMs = 500,
    ...fetchOptions
  } = options;

  const headers = {
    ...fetchOptions.headers,
  };

  if (
    fetchOptions.body &&
    !(
      fetchOptions.body instanceof
      FormData
    )
  ) {
    headers["Content-Type"] =
      "application/json";
  }

  const requestPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  const requestUrl =
    `${API_URL}${requestPath}`;

  async function performRequest() {
    return fetch(
      requestUrl,
      {
        ...fetchOptions,
        headers,
        credentials:
          "include",
      },
    );
  }

  let response;

  try {
    response =
      await performRequest();
  } catch (error) {
    if (
      isAbortError(error)
    ) {
      throw error;
    }

    if (
      !retryOnNetworkError
    ) {
      throw createNetworkError(
        error,
      );
    }

    await wait(
      retryDelayMs,
    );

    try {
      response =
        await performRequest();
    } catch (retryError) {
      if (
        isAbortError(
          retryError,
        )
      ) {
        throw retryError;
      }

      throw createNetworkError(
        retryError,
      );
    }
  }

  const data =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    const error = new Error(
      data?.error ||
        `Request failed with status ${response.status}`,
    );

    error.status =
      response.status;

    error.fields =
      data?.fields || {};

    throw error;
  }

  return data;
}