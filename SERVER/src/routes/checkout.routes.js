const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { getDb, ObjectId } = require("../db");
const { createOrder } = require("../controllers/orders.controller");

const rawKey = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_SECRET_KEY = rawKey.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/^['"]|['"]$/g, "").trim();
if (!/^sk_(test|live)_/.test(STRIPE_SECRET_KEY)) throw new Error("STRIPE_SECRET_KEY invalid");
const stripe = require("stripe")(STRIPE_SECRET_KEY);

const rawFront = process.env.FRONTEND_URL || "http://localhost:3000";
const FRONTEND_URL = rawFront.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/^['"]|['"]$/g, "").trim().replace(/\/$/, "");
(function () {
  const u = new URL(FRONTEND_URL);
  if (!/^https?:$/.test(u.protocol)) throw new Error("FRONTEND_URL must be http(s)");
})();

function toAbsoluteImage(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url, FRONTEND_URL + "/");
    if (/^https?:$/.test(u.protocol)) return u.href;
  } catch {}
  return null;
}

function toNumberLike(v) {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const s = v.replace(/[^0-9.-]/g, "");
    return s ? Number(s) : NaN;
  }
  if (typeof v === "object") {
    if (typeof v.$numberLong === "string") return Number(v.$numberLong);
    if (typeof v.$numberInt === "string") return Number(v.$numberInt);
    if (typeof v.$numberDecimal === "string") return Number(v.$numberDecimal);
    if (v._bsontype === "Decimal128" && typeof v.toString === "function") return Number(v.toString());
    if ("value" in v) return toNumberLike(v.value);
    if ("amount" in v) return toNumberLike(v.amount);
    if ("price" in v) return toNumberLike(v.price);
  }
  return NaN;
}

function toPence(value) {
  const n = toNumberLike(value);
  if (!Number.isFinite(n)) return NaN;
  return Number.isInteger(n) ? n : Math.round(n * 100);
}

router.post("/create-session", requireAuth, async (req, res, next) => {
  try {
    const db = getDb(req);
    const cart = await db.collection("carts").findOne({ userId: req.userId });
    if (!cart || !cart.items?.length) return res.status(400).json({ error: "Cart is empty" });

    const line_items = [];
    const problems = [];

    for (const item of cart.items) {
      const latest = await db.collection("products").findOne({ _id: new ObjectId(item.productId), isActive: true });
      if (!latest) {
        problems.push({ productId: item.productId, reason: "Product no longer available" });
        continue;
      }

      const stockNum = toNumberLike(latest.stock);
      const stock = Number.isFinite(stockNum) ? stockNum : undefined;

      const qty = Math.max(1, Number(item.quantity || 1));
      if (Number.isFinite(stock) && qty > stock) {
        problems.push({ productId: item.productId, reason: `Only ${stock} left in stock` });
        continue;
      }

      const unit_amount = toPence(latest.price);
      if (!Number.isFinite(unit_amount) || unit_amount < 1) {
        problems.push({ productId: item.productId, reason: "Invalid price" });
        continue;
      }

      const imgs = Array.isArray(latest.images) ? latest.images.map(toAbsoluteImage).filter(Boolean) : [];

      line_items.push({
        price_data: {
          currency: "gbp",
          product_data: { name: latest.title || "Item", ...(imgs.length ? { images: imgs } : {}) },
          unit_amount,
        },
        quantity: qty,
        adjustable_quantity: Number.isFinite(stock) ? { enabled: true, minimum: 1, maximum: Math.max(1, stock) } : { enabled: false },
      });
    }

    if (!line_items.length) return res.status(409).json({ error: "No items available to buy", details: problems });
    if (problems.length) return res.status(409).json({ error: "Some items unavailable", details: problems });

    const success_url = `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${FRONTEND_URL}/checkout/cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      allow_promotion_codes: true,
      client_reference_id: req.userId.toString(),
      success_url,
      cancel_url,
    });

    res.json({ id: session.id, pk: process.env.STRIPE_PUBLISHABLE_KEY || process.env.REACT_APP_STRIPE_PUBLIC_KEY || "" });
  } catch (e) {
    next(e);
  }
});

router.post("/confirm", requireAuth, async (req, res, next) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: "Missing session id" });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    if (String(session.client_reference_id || "") !== String(req.userId)) {
      return res.status(403).json({ error: "Session does not belong to this user" });
    }

    if (session.payment_status !== "paid") {
      return res.status(402).json({ error: "Payment not completed" });
    }

    return createOrder(req, res, next);
  } catch (e) {
    next(e);
  }
});

router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  res.sendStatus(200);
});

module.exports = router;
