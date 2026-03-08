const express = require("express");
const { listProducts, trendingProducts, getProduct } = require("../controllers/products.controller");

const router = express.Router();

router.get("/", listProducts);
router.get("/trending", trendingProducts);
router.get("/:id", getProduct);

module.exports = router;
