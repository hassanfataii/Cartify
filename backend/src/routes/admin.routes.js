import { Router } from "express";

import {
  getAdminSummary,
} from "../controllers/admin.controller.js";

import {
  getAdminProducts,
} from "../controllers/admin-product-list.controller.js";

import {
  getAdminOrders,
} from "../controllers/admin-order-list.controller.js";

import {
  updateAdminOrderStatus,
} from "../controllers/admin-order-status.controller.js";

import {
  createAdminProduct,
  updateAdminProduct,
} from "../controllers/admin-product.controller.js";

import {
  uploadAdminProductImages,
} from "../controllers/admin-upload.controller.js";

import {
  uploadProductImages,
} from "../middleware/upload.middleware.js";

import {
  requireAdmin,
} from "../middleware/admin.middleware.js";

import {
  requireAuthentication,
} from "../middleware/auth.middleware.js";

const router = Router();

router.use(
  requireAuthentication,
  requireAdmin,
);

router.get(
  "/summary",
  getAdminSummary,
);

router.get(
  "/products",
  getAdminProducts,
);

router.post(
  "/products",
  createAdminProduct,
);

router.put(
  "/products/:productId",
  updateAdminProduct,
);

router.post(
  "/uploads/images",
  uploadProductImages,
  uploadAdminProductImages,
);

router.get(
  "/orders",
  getAdminOrders,
);

router.patch(
  "/orders/:orderId/status",
  updateAdminOrderStatus,
);

export default router;