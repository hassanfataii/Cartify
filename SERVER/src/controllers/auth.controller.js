const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDb } = require("../db");

function signToken(userId) {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
}

async function register(req, res, next) {
  try {
    const db = getDb(req);
    const { firstName = "", lastName = "", email = "", password = "" } = req.body || {};
    const normEmail = String(email).trim().toLowerCase();
    if (!normEmail || !password) return res.status(400).json({ error: "Email and password are required" });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const now = new Date();

    const doc = {
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: normEmail,
      passwordHash,
      addresses: [],
      createdAt: now,
      updatedAt: now,
    };

    const { insertedId } = await db.collection("users").insertOne(doc);

    const user = await db.collection("users").findOne(
      { _id: insertedId },
      { projection: { password: 0, passwordHash: 0 } }
    );

    const token = signToken(insertedId);
    res.status(201).json({ token, user });
  } catch (e) {
    if (e?.code === 11000 && e?.keyPattern?.email) {
      return res.status(409).json({ error: "Email already in use" });
    }
    next(e);
  }
}

async function login(req, res, next) {
  try {
    const db = getDb(req);
    const { email = "", password = "" } = req.body || {};
    const normEmail = String(email).trim().toLowerCase();
    if (!normEmail || !password) return res.status(400).json({ error: "Email and password are required" });

    const user = await db.collection("users").findOne({ email: normEmail }, { projection: { passwordHash: 1 } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(String(password), String(user.passwordHash || ""));
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const publicUser = await db.collection("users").findOne(
      { _id: user._id },
      { projection: { password: 0, passwordHash: 0 } }
    );

    const token = signToken(user._id);
    res.json({ token, user: publicUser });
  } catch (e) {
    next(e);
  }
}

async function me(req, res, next) {
  try {
    const db = getDb(req);
    const user = await db.collection("users").findOne(
      { _id: req.userId },
      { projection: { password: 0, passwordHash: 0 } }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (e) {
    next(e);
  }
}

module.exports = { register, login, me };