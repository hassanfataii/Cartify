const { getDb, ObjectId } = require("../db");

function parsePrice(v) {
  if (typeof v === "number") return Number.isInteger(v) && v >= 1000 ? v / 100 : v;
  const s = String(v ?? "").replace(/[^\d.]/g, "");
  if (!s) return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return !s.includes(".") && n >= 1000 ? n / 100 : n;
}

function numberLike(v) {
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
    if ("value" in v) return numberLike(v.value);
    if ("amount" in v) return numberLike(v.amount);
    if ("price" in v) return numberLike(v.price);
  }
  return NaN;
}

function recalcTotals(items, shipping = 0) {
  const subtotal = items.reduce(
    (sum, it) => sum + parsePrice(it?.product?.price) * Number(it.quantity || 0),
    0
  );
  const shippingTotal = Number(shipping || 0);
  const grandTotal = subtotal + shippingTotal;
  return { subtotal, shippingTotal, grandTotal };
}

function pickProductId(req) {
  return req.params?.productId || req.body?.productId || null;
}

function snapshotProduct(p) {
  if (!p) return {};
  const price = numberLike(p.price);
  const stockNum = numberLike(typeof p.stock !== "undefined" ? p.stock : undefined);
  return {
    _id: p._id,
    title: p.title,
    price: Number.isFinite(price) ? price : 0,
    images: Array.isArray(p.images) ? p.images.slice(0, 3) : [],
    sku: p.sku || undefined,
    stock: Number.isFinite(stockNum) ? stockNum : undefined,
  };
}

async function getCart(req, res, next) {
  try {
    const db = getDb(req);
    const cart = await db.collection("carts").findOne({ userId: req.userId });
    if (!cart) {
      return res.json({ userId: req.userId, items: [], subtotal: 0, shippingTotal: 0, grandTotal: 0 });
    }
    const totals = recalcTotals(cart.items || [], cart.shippingTotal);
    return res.json({ ...cart, ...totals });
  } catch (e) { next(e); }
}

async function addToCart(req, res, next) {
  try {
    const db = getDb(req);
    const pid = pickProductId(req);
    if (!pid) return res.status(400).json({ error: "productId required" });

    const product = await db.collection("products").findOne({ _id: new ObjectId(pid) });
    if (!product || product.isActive === false) return res.status(404).json({ error: "Product not found" });

    const qty = Math.max(1, Number(req.body?.quantity || 1));
    const snap = snapshotProduct(product);

    let cart = await db.collection("carts").findOne({ userId: req.userId });
    if (!cart) {
      cart = {
        userId: req.userId,
        items: [{ productId: snap._id, product: snap, quantity: qty }],
        subtotal: 0,
        shippingTotal: 0,
        grandTotal: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const totals = recalcTotals(cart.items, cart.shippingTotal);
      cart = { ...cart, ...totals };
      await db.collection("carts").insertOne(cart);
      return res.json(cart);
    }

    const items = Array.isArray(cart.items) ? cart.items.slice() : [];
    const idx = items.findIndex((i) => String(i.productId) === String(snap._id));
    if (idx >= 0) {
      const current = Number(items[idx].quantity || 0);
      const cap = Number.isFinite(Number(snap.stock)) ? Number(snap.stock) : Number.MAX_SAFE_INTEGER;
      items[idx] = { ...items[idx], product: snap, quantity: Math.min(current + qty, cap) };
    } else {
      items.push({ productId: snap._id, product: snap, quantity: Math.min(qty, Number.isFinite(Number(snap.stock)) ? Number(snap.stock) : qty) });
    }

    const totals = recalcTotals(items, cart.shippingTotal);
    await db.collection("carts").updateOne(
      { userId: req.userId },
      { $set: { items, ...totals, updatedAt: new Date() } }
    );

    const updated = await db.collection("carts").findOne({ userId: req.userId });
    res.json({ ...updated, ...totals });
  } catch (e) { next(e); }
}

async function updateCartItem(req, res, next) {
  try {
    const db = getDb(req);
    const pId = pickProductId(req);
    const desiredQty = Math.max(1, Number(req.body?.quantity || 1));

    const cart = await db.collection("carts").findOne({ userId: req.userId });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const idx = (cart.items || []).findIndex((i) => String(i.productId) === String(pId));
    if (idx === -1) return res.status(404).json({ error: "Item not in cart" });

    const snap = cart.items[idx]?.product || {};
    let cap = Number.isFinite(Number(snap.stock)) ? Number(snap.stock) : undefined;

    if (!Number.isFinite(cap)) {
      const prod = await db.collection("products").findOne({ _id: new ObjectId(pId) });
      cap = Number.isFinite(numberLike(prod?.stock)) ? numberLike(prod.stock) : Number.MAX_SAFE_INTEGER;
      const refreshedSnap = snapshotProduct(prod || snap);
      cart.items[idx].product = refreshedSnap;
    }

    const qty = Math.max(1, Math.min(desiredQty, cap || Number.MAX_SAFE_INTEGER));
    cart.items[idx].quantity = qty;

    const totals = recalcTotals(cart.items, cart.shippingTotal);
    await db.collection("carts").updateOne(
      { userId: req.userId },
      { $set: { items: cart.items, ...totals, updatedAt: new Date() } }
    );

    res.json({ ...cart, ...totals });
  } catch (e) { next(e); }
}

async function removeCartItem(req, res, next) {
  try {
    const db = getDb(req);
    const pId = pickProductId(req);
    const cart = await db.collection("carts").findOne({ userId: req.userId });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const items = (cart.items || []).filter((i) => String(i.productId) !== String(pId));
    const totals = recalcTotals(items, cart.shippingTotal);

    await db.collection("carts").updateOne(
      { userId: req.userId },
      { $set: { items, ...totals, updatedAt: new Date() } }
    );

    res.json({ ...cart, items, ...totals });
  } catch (e) { next(e); }
}

module.exports = { getCart, addToCart, updateCartItem, removeCartItem };
