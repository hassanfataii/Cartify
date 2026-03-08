const { getDb, ObjectId } = require("../db");

async function getWishlist(req, res, next) {
  try {
    const db = getDb(req);
    const user = await db.collection("users").findOne(
      { _id: req.userId },
      { projection: { wishlist: 1 } }
    );
    const ids = user?.wishlist || [];
    if (!ids.length) return res.json([]);

    const prods = await db.collection("products")
      .find({ _id: { $in: ids }, isActive: true })
      .project({ title: 1, images: 1, price: 1, stock: 1 })
      .toArray();

    res.json(prods);
  } catch (e) { next(e); }
}

async function addToWishlist(req, res, next) {
  try {
    const db = getDb(req);
    const { productId } = req.params;
    if (!ObjectId.isValid(productId)) return res.status(400).json({ error: "Invalid product id" });
    const pId = new ObjectId(productId);

    const exists = await db.collection("products").findOne(
      { _id: pId, isActive: true },
      { projection: { _id: 1 } }
    );
    if (!exists) return res.status(404).json({ error: "Product not found" });

    await db.collection("users").updateOne(
      { _id: req.userId },
      { $addToSet: { wishlist: pId }, $set: { updatedAt: new Date() } }
    );
    res.status(204).end();
  } catch (e) { next(e); }
}

async function removeFromWishlist(req, res, next) {
  try {
    const db = getDb(req);
    const { productId } = req.params;
    if (!ObjectId.isValid(productId)) return res.status(400).json({ error: "Invalid product id" });
    const pId = new ObjectId(productId);

    await db.collection("users").updateOne(
      { _id: req.userId },
      { $pull: { wishlist: pId }, $set: { updatedAt: new Date() } }
    );
    res.status(204).end();
  } catch (e) { next(e); }
}

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
