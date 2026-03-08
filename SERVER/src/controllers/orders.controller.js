const { getDb, ObjectId } = require("../db");

const dbFrom = (req) => {
  try {
    return getDb.length > 0 ? getDb(req) : getDb();
  } catch {
    return getDb();
  }
};

const asObjectId = (v) => {
  try { return new ObjectId(String(v)); } catch { return null; }
};

const toNumberLike = (v) => {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const s = v.replace(/[^0-9.-]/g, "");
    return s ? Number(s) : NaN;
  }
  if (typeof v === "object") {
    if (typeof v.$numberLong === "string") return Number(v.$numberLong);
    if (typeof v.$numberInt === "string") return Number(v.$numberInt);
    if (typeof v.$numberDecimal === "string") return Number(v.$numberDecimal);
    if (v._bsontype === "Decimal128" && typeof v.toString === "function") return Number(v.toString());
    if ("value" in v) return toNumberLike(v.value);
    if ("amount" in v) return toNumberLike(v.amount);
    if ("price" in v) return toNumberLike(v.price);
  }
  return NaN;
};

const pence = (v) => {
  const n = toNumberLike(v);
  if (!Number.isFinite(n)) return 0;
  return Number.isInteger(n) ? n : Math.round(n * 100);
};

async function getMyOrders(req, res) {
  try {
    const db = dbFrom(req);
    const list = await db
      .collection("orders")
      .find({ userId: req.userId })
      .sort({ placedAt: -1 })
      .toArray();
    return res.json(list);
  } catch (e) {
    console.error("[getMyOrders]", e?.message || e);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
}

const listMyOrders = (req, res) => getMyOrders(req, res);

async function getOrderById(req, res) {
  try {
    const db = dbFrom(req);
    const id = asObjectId(req.params.id) || req.params.id;
    const doc = await db.collection("orders").findOne({ _id: id, userId: req.userId });
    if (!doc) return res.status(404).json({ error: "Not found" });
    return res.json(doc);
  } catch (e) {
    console.error("[getOrderById]", e?.message || e);
    return res.status(500).json({ error: "Failed to fetch order" });
  }
}

async function createOrder(req, res) {
  try {
    const sessionId =
      req.body?.sessionId ||
      req.query?.session_id ||
      req.query?.sessionId ||
      "";

    if (!sessionId) return res.status(400).json({ error: "Missing session id" });

    const db = dbFrom(req);
    const ordersCol = db.collection("orders");
    const cartsCol = db.collection("carts");
    const productsCol = db.collection("products");

    const existing = await ordersCol.findOne(
      { stripeSessionId: sessionId },
      { projection: { _id: 1 } }
    );
    if (existing) return res.json({ ok: true, orderId: String(existing._id) });

    const cart = await cartsCol.findOne({ userId: req.userId });
    const cartItems = Array.isArray(cart?.items) ? cart.items : [];
    if (!cartItems.length) return res.status(400).json({ error: "Cart is empty" });

    const ids = cartItems.map((it) => asObjectId(it.productId || it._id)).filter(Boolean);
    const prodDocs = await productsCol
      .find({ _id: { $in: ids } })
      .project({ title: 1, name: 1, images: 1, price: 1, stock: 1, isActive: 1 })
      .toArray();
    const prodMap = new Map(prodDocs.map((d) => [String(d._id), d]));

    let subtotal = 0;
    const orderItems = cartItems.map((it) => {
      const pid = asObjectId(it.productId || it._id);
      const qty = Number(it.quantity || it.qty || 1) || 1;
      const snap = pid ? prodMap.get(String(pid)) : null;
      const unit = pence(snap?.price?.value ?? snap?.price ?? 0);
      subtotal += unit * qty;
      return {
        productId: pid || it.productId || it._id,
        quantity: qty,
        product: snap
          ? {
              _id: snap._id,
              title: snap.title || snap.name || "Item",
              images: Array.isArray(snap.images) ? snap.images : [],
              price: { value: unit }
            }
          : null
      };
    });

    const shippingTotal = 0;
    const discountTotal = 0;
    const taxTotal = 0;
    const grandTotal = subtotal + shippingTotal - discountTotal + taxTotal;

    const orderDoc = {
      userId: req.userId,
      placedAt: new Date(),
      status: "paid",
      currency: "gbp",
      items: orderItems,
      subtotal,
      shippingTotal,
      discountTotal,
      taxTotal,
      grandTotal,
      stripeSessionId: sessionId
    };

    const ins = await ordersCol.insertOne(orderDoc);
    const orderId = ins.insertedId;

    const failures = [];
    for (const it of orderItems) {
      const pidRaw = it.productId || it.product?._id || it._id;
      const qty = Number(it.quantity || 1) || 1;
      if (!pidRaw || qty <= 0) continue;

      const pid = asObjectId(pidRaw) || pidRaw;

      let r = await productsCol.updateOne(
        { _id: pid, "stock.value": { $gte: qty } },
        { $inc: { "stock.value": -qty }, $set: { updatedAt: new Date() } }
      );

      if (r.matchedCount === 0) {
        r = await productsCol.updateOne(
          { _id: pid, stock: { $gte: qty } },
          { $inc: { stock: -qty }, $set: { updatedAt: new Date() } }
        );
      }

      if (r.matchedCount === 0) {
        failures.push({ productId: String(pidRaw), requested: qty });
      }
    }

    await ordersCol.updateOne(
      { _id: orderId },
      {
        $set: {
          stockAdjustedAt: new Date(),
          ...(failures.length ? { stockFailures: failures } : {})
        }
      }
    );

    await cartsCol.updateOne({ userId: req.userId }, { $set: { items: [] } });

    return res.json({ ok: true, orderId: String(orderId) });
  } catch (e) {
    console.error("[createOrder]", e?.message || e);
    return res.status(500).json({ error: "Server error" });
  }
}

async function getTrendingProducts(req, res) {
  try {
    const db = dbFrom(req);
    const agg = await db.collection("orders").aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: { $toString: "$items.productId" },
          qty: { $sum: { $ifNull: ["$items.quantity", 1] } },
          revenue: { $sum: { $ifNull: ["$items.product.price.value", 0] } }
        }
      },
      { $sort: { qty: -1, revenue: -1 } },
      { $limit: 12 }
    ]).toArray();

    const ids = agg.map((a) => a._id).map(asObjectId).filter(Boolean);
    const prods = await db.collection("products")
      .find({ _id: { $in: ids } })
      .project({ title: 1, name: 1, images: 1, price: 1 })
      .toArray();
    const pmap = new Map(prods.map((p) => [String(p._id), p]));

    const result = agg.map((a) => ({
      productId: a._id,
      qty: a.qty,
      revenue: a.revenue,
      product: pmap.get(String(a._id)) || null
    }));

    return res.json(result);
  } catch (e) {
    console.error("[getTrendingProducts]", e?.message || e);
    return res.status(500).json({ error: "Failed to compute trending products" });
  }
}

module.exports = {
  listMyOrders,
  getOrderById,
  createOrder,
  getTrendingProducts,
  getMyOrders
};
