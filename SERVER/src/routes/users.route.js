const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  getMe,
  updateMe,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} = require("../controllers/users.controller");

const router = express.Router();

router.get("/me", requireAuth, getMe);
router.put("/me", requireAuth, updateMe);

router.get("/addresses", requireAuth, listAddresses);
router.post("/addresses", requireAuth, createAddress);
router.put("/addresses/:id", requireAuth, updateAddress);
router.delete("/addresses/:id", requireAuth, deleteAddress);

module.exports = router;
