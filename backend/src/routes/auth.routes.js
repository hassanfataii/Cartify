import {
  Router,
} from "express";

import {
  rateLimit,
} from "express-rate-limit";

import {
  getCurrentUser,
  googleLogin,
  login,
  logout,
  register,
} from "../controllers/auth.controller.js";

import {
  forgotPassword,
  resetPassword,
} from "../controllers/password-reset.controller.js";

const router =
  Router();

const authenticationLimiter =
  rateLimit({
    windowMs:
      15 *
      60 *
      1000,

    limit: 10,

    standardHeaders:
      "draft-8",

    legacyHeaders:
      false,

    message: {
      error:
        "Too many authentication attempts. Please try again later.",
    },
  });

const passwordResetLimiter =
  rateLimit({
    windowMs:
      15 *
      60 *
      1000,

    limit: 5,

    standardHeaders:
      "draft-8",

    legacyHeaders:
      false,

    message: {
      error:
        "Too many password reset attempts. Please try again later.",
    },
  });

router.post(
  "/register",
  authenticationLimiter,
  register,
);

router.post(
  "/login",
  authenticationLimiter,
  login,
);

router.post(
  "/google",
  authenticationLimiter,
  googleLogin,
);

router.post(
  "/forgot-password",
  passwordResetLimiter,
  forgotPassword,
);

router.post(
  "/reset-password",
  passwordResetLimiter,
  resetPassword,
);

router.post(
  "/logout",
  logout,
);

router.get(
  "/me",
  getCurrentUser,
);

export default router;