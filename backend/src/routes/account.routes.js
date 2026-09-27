import { Router } from "express";

import {
  addAddress,
  changePassword,
  deleteAddress,
  getAccount,
  updateAddress,
  updateProfile,
} from "../controllers/account.controller.js";

import {
  requireAuthentication,
} from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuthentication);

router.get("/", getAccount);

router.put(
  "/profile",
  updateProfile,
);

router.put(
  "/password",
  changePassword,
);

router.post(
  "/addresses",
  addAddress,
);

router.put(
  "/addresses/:addressId",
  updateAddress,
);

router.delete(
  "/addresses/:addressId",
  deleteAddress,
);

export default router;