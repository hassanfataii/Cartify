import { Router } from "express";

import { createCheckoutSession } from "../controllers/checkout.controller.js";
import { requireAuthentication } from "../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/session",
  requireAuthentication,
  createCheckoutSession,
);

export default router;