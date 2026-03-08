const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const { connectToDb } = require("./db");
const { notFound, errorHandler } = require("./middleware/error");

const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.route");
const productsRoutes = require("./routes/products.routes");
const cartRoutes = require("./routes/cart.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const checkoutRoutes = require("./routes/checkout.routes");
const categoriesRoutes = require("./routes/categories.routes");
const ordersRoutes = require("./routes/orders.routes");

const PORT = process.env.PORT || 5000;

async function start() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const db = await connectToDb(process.env.MONGODB_URI);
  app.locals.db = db;

  app.get("/", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/products", productsRoutes);
  app.use("/api/categories", categoriesRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/wishlist", wishlistRoutes);
  app.use("/api/checkout", checkoutRoutes);

  app.use(notFound);
  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

start().catch((e) => {
  console.error("Failed to start server:", e);
  process.exit(1);
});
