const { getDb, ObjectId } = require("../db");

async function listProducts(req, res, next) {
  try {
    const db = getDb(req);
    const { categoryId, categoryName } = req.query;
    const query = { isActive: true };

    if (categoryId) {
      if (!ObjectId.isValid(categoryId)) {
        return res.status(400).json({ error: "Invalid categoryId" });
      }
      query.category = new ObjectId(categoryId);
    }
    if (categoryName) {
      const cat = await db.collection("categories").findOne({ name: categoryName });
      if (!cat) return res.json([]);
      query.category = cat._id;
    }

    const products = await db.collection("products")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.json(products);
  } catch (e) { next(e); }
}

async function trendingProducts(req, res, next) {
  try {
    const db = getDb(req);
    const days  = Number(req.query.days || 30);
    const limit = Math.max(1, Number(req.query.limit || 3));
    const pipeline = [];

    if (days > 0) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      pipeline.push({ $match: { createdAt: { $gte: since } } });
    }

    pipeline.push(
      { $unwind: "$items" },
      { $group: { _id: "$items.productId", qty: { $sum: "$items.quantity" } } },
      { $sort: { qty: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: "$product._id",
          title: "$product.title",
          images: "$product.images",
          price: "$product.price",
          stock: "$product.stock",
          category: "$product.category",
          isActive: "$product.isActive",
          trendingQty: "$qty",
        },
      }
    );

    const trending = await db.collection("orders").aggregate(pipeline).toArray();

    if (!trending.length) {
      const fallback = await db.collection("products")
        .find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
      return res.json(fallback);
    }

    res.json(trending);
  } catch (e) { next(e); }
}

async function getProduct(req, res, next) {
  try {
    const db = getDb(req);
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }
    const prod = await db.collection("products").findOne({ _id: new ObjectId(id) });
    if (!prod) return res.status(404).json({ error: "Not found" });
    res.json(prod);
  } catch (e) { next(e); }
}

module.exports = { listProducts, trendingProducts, getProduct };
