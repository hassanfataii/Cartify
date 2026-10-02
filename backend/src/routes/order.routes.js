import { Router } from "express";

import {
  createReturnRequest,
  getOrderById,
  getOrderReturns,
  getOrders,
} from "../controllers/order.controller.js";

import {
  requireAuthentication,
} from "../middleware/auth.middleware.js";

const router = Router();

router.use(
  requireAuthentication,
);

router.get(
  "/",
  getOrders,
);

router.get(
  "/:orderId/returns",
  getOrderReturns,
);

router.post(
  "/:orderId/returns",
  createReturnRequest,
);

router.get(
  "/:orderId",
  getOrderById,
);

export default router;