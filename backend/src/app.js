import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";

import accountRoutes from "./routes/account.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import checkoutRoutes from "./routes/checkout.routes.js";
import orderRoutes from "./routes/order.routes.js";
import productRoutes from "./routes/product.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";

import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";

import {
  handleStripeWebhook,
} from "./controllers/stripe-webhook.controller.js";

const app = express();

// Render terminates HTTPS before forwarding requests to Express.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(helmet());

// Allow the configured storefront to make credentialed requests.
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

// Stripe needs the original body for signature verification.
// Register this route before JSON parsing and browser origin checks.
app.post(
  "/api/checkout/webhook",
  express.raw({
    type: "application/json",
  }),
  handleStripeWebhook,
);

// Reject browser mutations from other origins.
// CORS alone does not prevent cross-site requests from being submitted.
app.use((request, response, next) => {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];

  if (safeMethods.includes(request.method)) {
    return next();
  }

  const origin = request.get("Origin");
  const allowedOrigin = process.env.FRONTEND_URL?.replace(/\/+$/, "");

  if (origin && origin !== allowedOrigin) {
    return response.status(403).json({
      error: "This request came from an unapproved website",
    });
  }

  return next();
});

app.use(
  express.json({
    limit: "100kb",
  }),
);

app.use(cookieParser());

// Prevent shared caches from storing API responses containing user data.
app.use("/api", (request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

app.get("/api/health", (request, response) => {
  response.status(200).json({
    status: "ok",
    message: "Cartify API is running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;