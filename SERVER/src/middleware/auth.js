const jwt = require("jsonwebtoken");
const { ObjectId } = require("../db");

function secret() {
  const s = (process.env.JWT_SECRET || "").trim();
  return s || "dev-secret";
}

function requireAuth(req, res, next) {
  try {
    const h = String(req.headers.authorization || "");
    const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const payload = jwt.verify(token, secret());
    const id = payload && payload.userId;
    if (!id) return res.status(401).json({ error: "Unauthorized" });
    try {
      req.userId = new ObjectId(id);
    } catch {
      req.userId = id;
    }
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

module.exports = { requireAuth };
