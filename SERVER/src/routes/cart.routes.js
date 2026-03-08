const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
} = require("../controllers/cart.controller");

router.get("/", requireAuth, getCart);

router.post("/add", requireAuth, addToCart);
router.post("/add/:productId", requireAuth, addToCart);

router.put("/items/:productId", requireAuth, updateCartItem);

router.delete("/items/:productId", requireAuth, removeCartItem);

module.exports = router;
