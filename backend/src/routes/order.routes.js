import { Router } from "express";

import {
  getOrderById,
  getOrders,
} from "../controllers/order.controller.js";
import { requireAuthentication } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuthentication);

router.get("/", getOrders);
router.get("/:orderId", getOrderById);

export default router;