const express = require("express");
const { listCategories } = require("../controllers/categories.controller");

const router = express.Router();
router.get("/", listCategories);

module.exports = router;
