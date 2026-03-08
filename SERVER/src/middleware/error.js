function notFound(_req, res, _next) {
  res.status(404).json({ error: "Not Found" });
}

function errorHandler(err, _req, res, _next) {
  console.error("[ERROR]", err && err.stack ? err.stack : err);
  res.status(500).json({ error: "Server error" });
}

module.exports = { notFound, errorHandler };
