const { getDb } = require("../db");

async function listCategories(req, res, next) {
  try {
    const db = getDb(req);
    const cats = await db.collection("categories").find({ isActive: true }).toArray();
    res.json(cats);
  } catch (e) { next(e); }
}

module.exports = { listCategories };
