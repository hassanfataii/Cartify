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

import {
  createAuthenticationCookie,
  createTestOrder,
  createTestUser,
  seedTestCatalogue,
} from "./helpers/fixtures.js";

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

describe("Administrator API", () => {
  it("rejects admin access from a customer", async () => {
    const customer = await createTestUser();

    const cookie = createAuthenticationCookie(
      customer._id,
    );

    const response = await request(app)
      .get("/api/admin/summary")
      .set("Cookie", cookie)
      .expect(403);

    expect(response.body).toEqual({
      error: "Administrator access required",
    });
  });

  it("returns the administrator dashboard summary", async () => {
    const administrator = await createTestUser({
      email: "admin@cartify.test",
      role: "admin",
    });

    const customer = await createTestUser({
      email: "customer@cartify.test",
    });

    const { product } =
      await seedTestCatalogue({
        stock: 5,
      });

    await createTestOrder({
      userId: customer._id,
      product,
      quantity: 2,
    });

    const cookie = createAuthenticationCookie(
      administrator._id,
    );

    const response = await request(app)
      .get("/api/admin/summary")
      .set("Cookie", cookie)
      .expect(200);

    expect(response.body.summary).toEqual({
      customerCount: 1,
      activeProductCount: 1,
      lowStockCount: 1,
      paidOrderCount: 1,
      totalRevenueInPence: 4998,
    });

    expect(
      response.body.recentOrders,
    ).toHaveLength(1);

    expect(
      response.body.recentOrders[0].customer,
    ).toMatchObject({
      firstName: "Test",
      lastName: "User",
      email: "customer@cartify.test",
    });
  });

  it("creates products with unique slugs", async () => {
    const administrator = await createTestUser({
      email: "admin@cartify.test",
      role: "admin",
    });

    const { category } =
      await seedTestCatalogue();

    const cookie = createAuthenticationCookie(
      administrator._id,
    );

    const productPayload = {
      title: "New Test Product",
      description:
        "A brand new product created by an administrator.",
      categoryId: category._id.toString(),
      images: [
        "https://example.com/product.jpg",
      ],
      priceInPence: 3999,
      stock: 20,
      isActive: true,
      isFeatured: false,
    };

    const firstResponse = await request(app)
      .post("/api/admin/products")
      .set("Cookie", cookie)
      .send(productPayload)
      .expect(201);

    expect(firstResponse.body.product).toMatchObject({
      title: "New Test Product",
      slug: "new-test-product",
      priceInPence: 3999,
      stock: 20,
    });

    const secondResponse = await request(app)
      .post("/api/admin/products")
      .set("Cookie", cookie)
      .send(productPayload)
      .expect(201);

    expect(
      secondResponse.body.product.slug,
    ).toBe("new-test-product-2");
  });

  it("updates an existing product and regenerates its slug", async () => {
    const administrator = await createTestUser({
      email: "admin@cartify.test",
      role: "admin",
    });

    const {
      category,
      product,
    } = await seedTestCatalogue();

    const cookie = createAuthenticationCookie(
      administrator._id,
    );

    const response = await request(app)
      .put(`/api/admin/products/${product._id}`)
      .set("Cookie", cookie)
      .send({
        title: "Renamed Fixture Product",
        description:
          "The fixture product has been renamed by an administrator.",
        categoryId: category._id.toString(),
        images: product.images,
        priceInPence: 3499,
        stock: 14,
        isActive: true,
        isFeatured: true,
      })
      .expect(200);

    expect(response.body.product).toMatchObject({
      id: product._id.toString(),
      title: "Renamed Fixture Product",
      slug: "renamed-fixture-product",
      priceInPence: 3499,
      stock: 14,
      isFeatured: true,
    });
  });

  it("updates order status and records its history", async () => {
    const administrator = await createTestUser({
      email: "admin@cartify.test",
      role: "admin",
    });

    const customer = await createTestUser({
      email: "customer@cartify.test",
    });

    const { product } =
      await seedTestCatalogue();

    const order = await createTestOrder({
      userId: customer._id,
      product,
    });

    const cookie = createAuthenticationCookie(
      administrator._id,
    );

    const response = await request(app)
      .patch(
        `/api/admin/orders/${order._id}/status`,
      )
      .set("Cookie", cookie)
      .send({
        status: "shipped",
      })
      .expect(200);

    expect(response.body.order).toMatchObject({
      id: order._id.toString(),
      status: "shipped",
      paymentStatus: "paid",
    });

    expect(
      response.body.order.shippedAt,
    ).toBeTruthy();

    expect(
      response.body.order.statusHistory,
    ).toHaveLength(1);

    expect(
      response.body.order.statusHistory[0],
    ).toMatchObject({
      status: "shipped",
      changedBy:
        administrator._id.toString(),
    });

    const savedOrder = await getDatabase()
      .collection("orders")
      .findOne({
        _id: order._id,
      });

    expect(savedOrder.status).toBe("shipped");
    expect(savedOrder.shippedAt).toBeInstanceOf(
      Date,
    );
  });

  it("rejects an invalid order status", async () => {
    const administrator = await createTestUser({
      email: "admin@cartify.test",
      role: "admin",
    });

    const customer = await createTestUser({
      email: "customer@cartify.test",
    });

    const { product } =
      await seedTestCatalogue();

    const order = await createTestOrder({
      userId: customer._id,
      product,
    });

    const cookie = createAuthenticationCookie(
      administrator._id,
    );

    const response = await request(app)
      .patch(
        `/api/admin/orders/${order._id}/status`,
      )
      .set("Cookie", cookie)
      .send({
        status: "launched_into_space",
      })
      .expect(400);

    expect(response.body.error).toBe(
      "Please check the submitted status",
    );

    expect(response.body.fields).toHaveProperty(
      "status",
    );
  });

  it("returns 400 for an invalid admin order ID", async () => {
    const administrator = await createTestUser({
      email: "admin@cartify.test",
      role: "admin",
    });

    const cookie = createAuthenticationCookie(
      administrator._id,
    );

    const response = await request(app)
      .patch(
        "/api/admin/orders/not-a-valid-id/status",
      )
      .set("Cookie", cookie)
      .send({
        status: "shipped",
      })
      .expect(400);

    expect(response.body).toEqual({
      error: "Order ID is invalid",
    });
  });
});