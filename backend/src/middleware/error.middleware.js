export function notFoundHandler(
  request,
  response,
) {
  response.status(404).json({
    error: "Route not found",
  });
}

export function errorHandler(
  error,
  request,
  response,
  next,
) {
  if (response.headersSent) {
    return next(error);
  }

  const reportedStatus = Number(error.status);

  const status =
    error.name === "MulterError"
      ? 400
      : Number.isInteger(reportedStatus) &&
          reportedStatus >= 400 &&
          reportedStatus <= 599
        ? reportedStatus
        : 500;

  if (
    status >= 500 &&
    process.env.NODE_ENV !== "test"
  ) {
    console.error(error);
  }

  const hideInternalMessage =
    status >= 500 &&
    process.env.NODE_ENV === "production";

  return response.status(status).json({
    error: hideInternalMessage
      ? "Something went wrong"
      : error.message || "Something went wrong",
  });
}