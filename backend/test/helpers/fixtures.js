import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { getDatabase } from "../../src/config/database.js";

export async function createTestUser({
  firstName = "Test",
  lastName = "User",
  email = "test-user@example.com",
  phone = "07123456789",
  password = "SecurePass1",
  role = "customer",
} = {}) {
  const database = getDatabase();
  const now = new Date();

  const passwordHash = await bcrypt.hash(
    password,
    4,
  );

  const user = {
    firstName,
    lastName,
    email: email.trim().toLowerCase(),
    phone,
    passwordHash,
    role,
    addresses: [],
    createdAt: now,
    updatedAt: now,
  };

  const result = await database
    .collection("users")
    .insertOne(user);

  return {
    ...user,
    _id: result.insertedId,
  };
}

export function createAuthenticationCookie(userId) {
  const token = jwt.sign(
    {},
    process.env.JWT_SECRET,
    {
      subject: userId.toString(),
      expiresIn: "1h",
      algorithm: "HS256",
    },
  );

  return `cartify_token=${token}`;
}

export async function seedTestCatalogue({
  stock = 5,
  isActive = true,
  isFeatured = false,
} = {}) {
  const database = getDatabase();
  const now = new Date();

  const category = {
    name: "Test Electronics",
    slug: "test-electronics",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const categoryResult = await database
    .collection("categories")
    .insertOne(category);

  category._id = categoryResult.insertedId;

  const product = {
    title: "Fixture Product",
    slug: "fixture-product",
    description:
      "A product created for integration testing.",
    categoryId: category._id,
    images: [
      "/images/fixture-product.jpg",
      "/images/fixture-product-side.jpg",
    ],
    priceInPence: 2499,
    stock,
    isActive,
    isFeatured,
    createdAt: now,
    updatedAt: now,
  };

  const productResult = await database
    .collection("products")
    .insertOne(product);

  product._id = productResult.insertedId;

  return {
    category,
    product,
  };
}

export async function createTestOrder({
  userId,
  product,
  status = "processing",
  paymentStatus = "paid",
  quantity = 1,
} = {}) {
  const database = getDatabase();
  const now = new Date();

  const order = {
    userId,

    items: [
      {
        productId: product._id,
        title: product.title,
        slug: product.slug,
        image: product.images[0],
        quantity,
        unitPriceInPence:
          product.priceInPence,
        lineTotalInPence:
          product.priceInPence * quantity,
      },
    ],

    subtotalInPence:
      product.priceInPence * quantity,

    totalInPence:
      product.priceInPence * quantity,

    currency: "gbp",
    status,
    paymentStatus,

    stripeSessionId:
      `cs_test_${crypto.randomUUID()}`,

    paidAt:
      paymentStatus === "paid"
        ? now
        : null,

    createdAt: now,
    updatedAt: now,
  };

  const result = await database
    .collection("orders")
    .insertOne(order);

  return {
    ...order,
    _id: result.insertedId,
  };
}