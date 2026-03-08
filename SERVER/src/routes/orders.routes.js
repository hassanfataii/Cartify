const express = require("express");
const { requireAuth } = require("../middleware/auth");
const controllers = require("../controllers/orders.controller");

const router = express.Router();

const wrap = (name) => (req, res, next) => {
  const fn = controllers[name];
  if (typeof fn === "function") return fn(req, res, next);
  res.status(500).json({ error: `Handler missing: ${name}` });
};

router.post("/", requireAuth, wrap("createOrder"));
router.get("/", requireAuth, wrap("listMyOrders"));
router.get("/mine", requireAuth, wrap("listMyOrders"));
router.get("/trending", wrap("getTrendingProducts"));
router.get("/:id", requireAuth, wrap("getOrderById"));

module.exports = router;
