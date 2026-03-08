const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { getWishlist, addToWishlist, removeFromWishlist } = require("../controllers/wishlist.controller");

const router = express.Router();

router.get("/", requireAuth, getWishlist);
router.post("/:productId", requireAuth, addToWishlist);
router.delete("/:productId", requireAuth, removeFromWishlist);

module.exports = router;
