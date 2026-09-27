import { Router } from "express";

import {
  addWishlistItem,
  getWishlist,
  removeWishlistItem,
} from "../controllers/wishlist.controller.js";
import { requireAuthentication } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuthentication);

router.get("/", getWishlist);
router.post("/items", addWishlistItem);
router.delete(
  "/items/:productId",
  removeWishlistItem,
);

export default router;