import request from "supertest";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import app from "../src/app.js";
import { getDatabase } from "../src/config/database.js";

import {
  closeTestDatabase,
  connectTestDatabase,
  resetTestDatabase,
} from "./helpers/test-database.js";

async function seedCatalogue() {
  const database = getDatabase();
  const now = new Date();

  const categoryResult = await database
    .collection("categories")
    .insertOne({
      name: "Electronics",
      slug: "electronics",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

  const secondCategoryResult = await database
    .collection("categories")
    .insertOne({
      name: "Accessories",
      slug: "accessories",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

  await database
    .collection("categories")
    .insertOne({
      name: "Hidden",
      slug: "hidden",
      isActive: false,
      createdAt: now,
      updatedAt: now,
    });

  const productResult = await database
    .collection("products")
    .insertOne({
      title: "Test Laptop",
      slug: "test-laptop",
      description:
        "A laptop created for automated testing.",
      categoryId: categoryResult.insertedId,
      images: [
        "/images/test-laptop.jpg",
        "/images/test-laptop-side.jpg",
      ],
      priceInPence: 89999,
      stock: 12,
      isActive: true,
      isFeatured: true,
      createdAt: now,
      updatedAt: now,
    });

  await database
    .collection("products")
    .insertOne({
      title: "Test Mouse",
      slug: "test-mouse",
      description:
        "A wireless mouse created for testing.",
      categoryId: secondCategoryResult.insertedId,
      images: [
        "/images/test-mouse.jpg",
      ],
      priceInPence: 1999,
      stock: 25,
      isActive: true,
      isFeatured: false,
      createdAt: new Date(
        now.getTime() + 1000,
      ),
      updatedAt: now,
    });

  await database
    .collection("products")
    .insertOne({
      title: "Hidden Product",
      slug: "hidden-product",
      description:
        "This product should not appear publicly.",
      categoryId: categoryResult.insertedId,
      images: [
        "/images/hidden-product.jpg",
      ],
      priceInPence: 999,
      stock: 4,
      isActive: false,
      isFeatured: false,
      createdAt: now,
      updatedAt: now,
    });

  return {
    categoryId: categoryResult.insertedId,
    productId: productResult.insertedId,
  };
}

const validRegistration = {
  firstName: "Test",
  lastName: "Customer",
  email: "customer@example.com",
  phone: "07123456789",
  password: "SecurePass1",
};

beforeAll(async () => {
  await connectTestDatabase();
});

beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await resetTestDatabase();
  await closeTestDatabase();
});

describe("Cartify API", () => {
  it("returns the API health status", async () => {
    const response = await request(app)
      .get("/api/health")
      .expect(200);

    expect(response.body).toMatchObject({
      status: "ok",
      message: "Cartify API is running",
    });

    expect(
      Number.isNaN(
        Date.parse(response.body.timestamp),
      ),
    ).toBe(false);
  });

  it("returns JSON for an unknown route", async () => {
    const response = await request(app)
      .get("/api/definitely-not-real")
      .expect(404);

    expect(response.body).toEqual({
      error: "Route not found",
    });
  });

  it("returns only active categories", async () => {
    await seedCatalogue();

    const response = await request(app)
      .get("/api/categories")
      .expect(200);

    expect(response.body.data).toHaveLength(2);

    expect(
      response.body.data.map(
        (category) => category.slug,
      ),
    ).toEqual([
      "accessories",
      "electronics",
    ]);
  });

  it("returns active products in the requested order", async () => {
    await seedCatalogue();

    const response = await request(app)
      .get("/api/products?sort=price-asc")
      .expect(200);

    expect(response.body.data).toHaveLength(2);

    expect(
      response.body.data.map(
        (product) => product.slug,
      ),
    ).toEqual([
      "test-mouse",
      "test-laptop",
    ]);

    expect(response.body.pagination).toMatchObject({
      page: 1,
      limit: 12,
      totalItems: 2,
      totalPages: 1,
    });
  });

  it("filters products by category", async () => {
    await seedCatalogue();

    const response = await request(app)
      .get(
        "/api/products?category=electronics",
      )
      .expect(200);

    expect(response.body.data).toHaveLength(1);

    expect(response.body.data[0]).toMatchObject({
      title: "Test Laptop",
      slug: "test-laptop",
      images: [
        "/images/test-laptop.jpg",
        "/images/test-laptop-side.jpg",
      ],

      category: {
        name: "Electronics",
        slug: "electronics",
      },
    });
  });

  it("returns an individual product by slug", async () => {
    await seedCatalogue();

    const response = await request(app)
      .get("/api/products/test-laptop")
      .expect(200);

    expect(response.body.data).toMatchObject({
      title: "Test Laptop",
      slug: "test-laptop",
      priceInPence: 89999,
      stock: 12,
      isFeatured: true,
      images: [
        "/images/test-laptop.jpg",
        "/images/test-laptop-side.jpg",
      ],
    });

    expect(response.body.data.category).toMatchObject({
      name: "Electronics",
      slug: "electronics",
    });
  });

  it("returns 404 for a missing product", async () => {
    const response = await request(app)
      .get("/api/products/not-a-real-product")
      .expect(404);

    expect(response.body).toEqual({
      error: "Product not found",
    });
  });

  it("rejects an invalid product query", async () => {
    const response = await request(app)
      .get("/api/products?page=0&limit=100")
      .expect(400);

    expect(response.body.error).toBe(
      "Invalid product query",
    );

    expect(response.body.fields).toHaveProperty(
      "page",
    );

    expect(response.body.fields).toHaveProperty(
      "limit",
    );
  });

  it("rejects invalid registration details", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        firstName: "",
        lastName: "",
        email: "not-an-email",
        phone: "12",
        password: "weak",
      })
      .expect(400);

    expect(response.body.error).toBe(
      "Please check the submitted details",
    );

    expect(response.body.fields).toHaveProperty(
      "firstName",
    );

    expect(response.body.fields).toHaveProperty(
      "email",
    );

    expect(response.body.fields).toHaveProperty(
      "password",
    );
  });

  it("registers a customer and restores their authenticated session", async () => {
    const agent = request.agent(app);

    const registrationResponse = await agent
      .post("/api/auth/register")
      .send({
        ...validRegistration,
        email: "  CUSTOMER@EXAMPLE.COM  ",
      })
      .expect(201);

    expect(
      registrationResponse.headers["set-cookie"]?.[0],
    ).toContain("cartify_token=");

    expect(
      registrationResponse.headers["set-cookie"]?.[0],
    ).toContain("HttpOnly");

    expect(
      registrationResponse.body.user,
    ).toMatchObject({
      firstName: "Test",
      lastName: "Customer",
      email: "customer@example.com",
      role: "customer",
    });

    expect(
      registrationResponse.body.user,
    ).not.toHaveProperty("passwordHash");

    const currentUserResponse = await agent
      .get("/api/auth/me")
      .expect(200);

    expect(
      currentUserResponse.body.user.email,
    ).toBe("customer@example.com");

    const savedUser = await getDatabase()
      .collection("users")
      .findOne({
        email: "customer@example.com",
      });

    expect(savedUser).not.toBeNull();
    expect(savedUser.passwordHash).toBeTruthy();
    expect(savedUser.passwordHash).not.toBe(
      validRegistration.password,
    );
  });

  it("rejects a duplicate email address", async () => {
    await request(app)
      .post("/api/auth/register")
      .send(validRegistration)
      .expect(201);

    const response = await request(app)
      .post("/api/auth/register")
      .send({
        ...validRegistration,
        firstName: "Another",
      })
      .expect(409);

    expect(response.body.error).toBe(
      "An account already exists with this email address",
    );

    expect(response.body.fields.email).toEqual([
      "This email address is already registered",
    ]);
  });

  it("protects authenticated customer routes", async () => {
    const cartResponse = await request(app)
      .get("/api/cart")
      .expect(401);

    expect(cartResponse.body).toEqual({
      error: "Authentication required",
    });

    await request(app)
      .get("/api/wishlist")
      .expect(401);

    await request(app)
      .get("/api/orders")
      .expect(401);
  });
});