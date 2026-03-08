const { getDb, ObjectId } = require("../db");

async function getMe(req, res, next) {
  try {
    const db = getDb(req);
    const user = await db.collection("users").findOne(
      { _id: req.userId },
      { projection: { password: 0, passwordHash: 0 } }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (e) { next(e); }
}

async function updateMe(req, res, next) {
  try {
    const db = getDb(req);
    const { firstName, lastName, email, phone } = req.body || {};
    const trimOr = (v) => (typeof v === "string" ? v.trim() : v);

    const update = {};
    if (firstName !== undefined) {
      const v = trimOr(firstName);
      if (v !== "") update.firstName = v;
    }
    if (lastName !== undefined) {
      const v = trimOr(lastName);
      if (v !== "") update.lastName = v;
    }
    if (email !== undefined) {
      const v = trimOr(email);
      if (v) update.email = v.toLowerCase();
    }
    if (phone !== undefined) {
      const v = trimOr(phone);
      update.phone = v ?? "";
    }
    update.updatedAt = new Date();

    const { value: user } = await db.collection("users").findOneAndUpdate(
      { _id: req.userId },
      { $set: update },
      { returnDocument: "after", projection: { password: 0, passwordHash: 0 } }
    );

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (e) {
    if (e?.code === 11000 && e?.keyPattern?.email) {
      return res.status(409).json({ error: "Email already in use" });
    }
    next(e);
  }
}

function sanitizeAddress(input = {}) {
  return {
    label: String(input.label || "").trim(),
    line1: String(input.line1 || "").trim(),
    line2: String(input.line2 || "").trim(),
    city: String(input.city || "").trim(),
    postcode: String(input.postcode || "").trim(),
    country: String(input.country || "").trim(),
  };
}

async function listAddresses(req, res, next) {
  try {
    const db = getDb(req);
    const user = await db.collection("users").findOne(
      { _id: req.userId },
      { projection: { addresses: 1 } }
    );
    res.json(user?.addresses || []);
  } catch (e) { next(e); }
}

async function createAddress(req, res, next) {
  try {
    const db = getDb(req);
    const addr = sanitizeAddress(req.body || {});
    const _id = new ObjectId();
    const r = await db.collection("users").updateOne(
      { _id: req.userId },
      { $push: { addresses: { _id, ...addr } }, $set: { updatedAt: new Date() } }
    );
    if (r.matchedCount === 0) return res.status(404).json({ error: "User not found" });
    res.status(201).json({ _id, ...addr });
  } catch (e) { next(e); }
}

async function updateAddress(req, res, next) {
  try {
    const db = getDb(req);
    const aid = new ObjectId(String(req.params.id));
    const addr = sanitizeAddress(req.body || {});
    const r = await db.collection("users").updateOne(
      { _id: req.userId, "addresses._id": aid },
      {
        $set: {
          "addresses.$.label": addr.label,
          "addresses.$.line1": addr.line1,
          "addresses.$.line2": addr.line2,
          "addresses.$.city": addr.city,
          "addresses.$.postcode": addr.postcode,
          "addresses.$.country": addr.country,
          updatedAt: new Date(),
        },
      }
    );
    if (r.matchedCount === 0) return res.status(404).json({ error: "Address not found" });
    res.json({ _id: aid, ...addr });
  } catch (e) { next(e); }
}

async function deleteAddress(req, res, next) {
  try {
    const db = getDb(req);
    const aid = new ObjectId(String(req.params.id));
    const r = await db.collection("users").updateOne(
      { _id: req.userId },
      { $pull: { addresses: { _id: aid } } }
    );
    if (r.matchedCount === 0) return res.status(404).json({ error: "User not found" });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

module.exports = {
  getMe,
  updateMe,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
};
