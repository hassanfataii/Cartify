import { Router } from "express";

import {
  getBestSellingProducts,
  getProductBySlug,
  getProducts,
} from "../controllers/product.controller.js";

const router = Router();

router.get("/", getProducts);

router.get(
  "/best-sellers",
  getBestSellingProducts,
);

router.get(
  "/:slug",
  getProductBySlug,
);

export default router;