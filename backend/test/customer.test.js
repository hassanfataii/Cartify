import request from "supertest";
import { ObjectId } from "mongodb";

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import app from "../src/app.js";

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

const testPassword = "Customer123";

async function registerTestCustomer({
  email = "account-customer@example.com",
} = {}) {
  const agent = request.agent(app);

  const response = await agent
    .post("/api/auth/register")
    .send({
      firstName: "Account",
      lastName: "Customer",
      email,
      phone: "",
      password: testPassword,
    })
    .expect(201);

  return {
    agent,
    user: response.body.user,
  };
}

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

describe("Authenticated customer API", () => {
  it("requires a saved address owned by the customer before checkout", async () => {
    const user = await createTestUser();
    const cookie = createAuthenticationCookie(user._id);

    await request(app)
      .post("/api/checkout/session")
      .set("Cookie", cookie)
      .send({})
      .expect(400);

    const response = await request(app)
      .post("/api/checkout/session")
      .set("Cookie", cookie)
      .send({ addressId: new ObjectId().toString() })
      .expect(400);

    expect(response.body.error).toBe("Select a valid saved delivery address");
  });

  it("adds, updates and removes a cart item", async () => {
    const user = await createTestUser();

    const { product } =
      await seedTestCatalogue({
        stock: 8,
      });

    const cookie =
      createAuthenticationCookie(
        user._id,
      );

    const addedResponse = await request(app)
      .post("/api/cart/items")
      .set("Cookie", cookie)
      .send({
        productId:
          product._id.toString(),
        quantity: 2,
      })
      .expect(200);

    expect(
      addedResponse.body.cart,
    ).toMatchObject({
      itemCount: 2,
      subtotalInPence: 4998,
    });

    expect(
      addedResponse.body.cart.items[0],
    ).toMatchObject({
      productId:
        product._id.toString(),
      title: "Fixture Product",
      quantity: 2,
      lineTotalInPence: 4998,
    });

    const updatedResponse =
      await request(app)
        .patch(
          `/api/cart/items/${product._id}`,
        )
        .set("Cookie", cookie)
        .send({
          quantity: 4,
        })
        .expect(200);

    expect(
      updatedResponse.body.cart
        .items[0].quantity,
    ).toBe(4);

    expect(
      updatedResponse.body.cart
        .subtotalInPence,
    ).toBe(9996);

    const removedResponse =
      await request(app)
        .delete(
          `/api/cart/items/${product._id}`,
        )
        .set("Cookie", cookie)
        .expect(200);

    expect(
      removedResponse.body.cart,
    ).toEqual({
      id: expect.any(String),
      items: [],
      itemCount: 0,
      subtotalInPence: 0,
    });
  });

  it("prevents cart quantities exceeding available stock", async () => {
    const user = await createTestUser();

    const { product } =
      await seedTestCatalogue({
        stock: 3,
      });

    const cookie =
      createAuthenticationCookie(
        user._id,
      );

    const response = await request(app)
      .post("/api/cart/items")
      .set("Cookie", cookie)
      .send({
        productId:
          product._id.toString(),
        quantity: 4,
      })
      .expect(400);

    expect(response.body).toEqual({
      error: "Only 3 available",
    });
  });

  it("returns 400 for an invalid cart product ID", async () => {
    const user = await createTestUser();

    const cookie =
      createAuthenticationCookie(
        user._id,
      );

    const response = await request(app)
      .post("/api/cart/items")
      .set("Cookie", cookie)
      .send({
        productId:
          "definitely-not-an-id",
        quantity: 1,
      })
      .expect(400);

    expect(response.body).toEqual({
      error: "Product ID is invalid",
    });
  });

  it("adds wishlist products only once and removes them", async () => {
    const user = await createTestUser();

    const { product } =
      await seedTestCatalogue();

    const cookie =
      createAuthenticationCookie(
        user._id,
      );

    await request(app)
      .post("/api/wishlist/items")
      .set("Cookie", cookie)
      .send({
        productId:
          product._id.toString(),
      })
      .expect(200);

    const repeatedResponse =
      await request(app)
        .post("/api/wishlist/items")
        .set("Cookie", cookie)
        .send({
          productId:
            product._id.toString(),
        })
        .expect(200);

    expect(
      repeatedResponse.body.wishlist
        .itemCount,
    ).toBe(1);

    expect(
      repeatedResponse.body.wishlist
        .items,
    ).toHaveLength(1);

    const removedResponse =
      await request(app)
        .delete(
          `/api/wishlist/items/${product._id}`,
        )
        .set("Cookie", cookie)
        .expect(200);

    expect(
      removedResponse.body.wishlist,
    ).toEqual({
      items: [],
      itemCount: 0,
    });
  });

  it("only returns orders belonging to the authenticated customer", async () => {
    const customer =
      await createTestUser();

    const otherCustomer =
      await createTestUser({
        email:
          "other-customer@example.com",
      });

    const { product } =
      await seedTestCatalogue();

    const ownOrder =
      await createTestOrder({
        userId: customer._id,
        product,
      });

    const foreignOrder =
      await createTestOrder({
        userId: otherCustomer._id,
        product,
      });

    await createTestOrder({
      userId: customer._id,
      product,
      status: "pending",
      paymentStatus: "unpaid",
    });

    const cookie =
      createAuthenticationCookie(
        customer._id,
      );

    const listResponse =
      await request(app)
        .get("/api/orders")
        .set("Cookie", cookie)
        .expect(200);

    expect(
      listResponse.body.orders,
    ).toHaveLength(1);

    expect(
      listResponse.body.orders[0].id,
    ).toBe(ownOrder._id.toString());

    const detailResponse =
      await request(app)
        .get(
          `/api/orders/${ownOrder._id}`,
        )
        .set("Cookie", cookie)
        .expect(200);

    expect(
      detailResponse.body.order,
    ).toMatchObject({
      id: ownOrder._id.toString(),
      status: "processing",
      paymentStatus: "paid",
      totalInPence: 2499,
    });

    await request(app)
      .get(
        `/api/orders/${foreignOrder._id}`,
      )
      .set("Cookie", cookie)
      .expect(404);
  });

  it("returns 400 for an invalid order ID", async () => {
    const user = await createTestUser();

    const cookie =
      createAuthenticationCookie(
        user._id,
      );

    const response = await request(app)
      .get(
        "/api/orders/not-a-valid-id",
      )
      .set("Cookie", cookie)
      .expect(400);

    expect(response.body).toEqual({
      error: "Order ID is invalid",
    });
  });

  it("rejects an invalid authentication cookie", async () => {
    const response = await request(app)
      .get("/api/cart")
      .set(
        "Cookie",
        "cartify_token=this-is-not-a-valid-token",
      )
      .expect(401);

    expect(response.body).toEqual({
      error:
        "Your session is invalid or has expired",
    });
  });

  it("returns the authenticated customer account", async () => {
    const user = await createTestUser({
      firstName: "Hassan",
      lastName: "Test",
      email: "hassan@example.com",
      phone: "07123456789",
    });

    const cookie =
      createAuthenticationCookie(
        user._id,
      );

    const response = await request(app)
      .get("/api/account")
      .set("Cookie", cookie)
      .expect(200);

    expect(
      response.body.user,
    ).toMatchObject({
      _id: user._id.toString(),
      firstName: "Hassan",
      lastName: "Test",
      email: "hassan@example.com",
      phone: "07123456789",
      role: "customer",
      addresses: [],
    });

    expect(
      response.body.user,
    ).not.toHaveProperty("passwordHash");
  });

  it("updates profile details without requiring a password when the email is unchanged", async () => {
    const user = await createTestUser({
      firstName: "Before",
      lastName: "Customer",
      email:
        "profile-customer@example.com",
      phone: "",
    });

    const cookie =
      createAuthenticationCookie(
        user._id,
      );

    const response = await request(app)
      .put("/api/account/profile")
      .set("Cookie", cookie)
      .send({
        firstName: "Updated",
        lastName: "Person",
        email:
          "profile-customer@example.com",
        phone: "07123456789",
        currentPassword: "",
      })
      .expect(200);

    expect(response.body).toMatchObject({
      message:
        "Account details updated successfully",

      user: {
        firstName: "Updated",
        lastName: "Person",
        email:
          "profile-customer@example.com",
        phone: "07123456789",
      },
    });

    const refreshedResponse =
      await request(app)
        .get("/api/account")
        .set("Cookie", cookie)
        .expect(200);

    expect(
      refreshedResponse.body.user,
    ).toMatchObject({
      firstName: "Updated",
      lastName: "Person",
      phone: "07123456789",
    });
  });

  it("requires the correct password when changing email address", async () => {
    const { agent } =
      await registerTestCustomer();

    const missingPasswordResponse =
      await agent
        .put("/api/account/profile")
        .send({
          firstName: "Account",
          lastName: "Customer",
          email:
            "changed-account@example.com",
          phone: "",
          currentPassword: "",
        })
        .expect(400);

    expect(
      missingPasswordResponse.body
        .fields.currentPassword,
    ).toEqual([
      "Your current password is required",
    ]);

    const incorrectPasswordResponse =
      await agent
        .put("/api/account/profile")
        .send({
          firstName: "Account",
          lastName: "Customer",
          email:
            "changed-account@example.com",
          phone: "",
          currentPassword:
            "DefinitelyWrong123",
        })
        .expect(401);

    expect(
      incorrectPasswordResponse.body
        .fields.currentPassword,
    ).toEqual([
      "Your current password is incorrect",
    ]);

    const successfulResponse =
      await agent
        .put("/api/account/profile")
        .send({
          firstName: "Account",
          lastName: "Customer",
          email:
            "changed-account@example.com",
          phone: "",
          currentPassword: testPassword,
        })
        .expect(200);

    expect(
      successfulResponse.body.user.email,
    ).toBe(
      "changed-account@example.com",
    );

    const accountResponse =
      await agent
        .get("/api/account")
        .expect(200);

    expect(
      accountResponse.body.user.email,
    ).toBe(
      "changed-account@example.com",
    );
  });

  it("prevents changing an account email to an existing email", async () => {
    await createTestUser({
      email: "already-used@example.com",
    });

    const { agent } =
      await registerTestCustomer({
        email: "email-owner@example.com",
      });

    const response = await agent
      .put("/api/account/profile")
      .send({
        firstName: "Account",
        lastName: "Customer",
        email: "already-used@example.com",
        phone: "",
        currentPassword: testPassword,
      })
      .expect(409);

    expect(response.body).toEqual({
      error:
        "An account already exists with this email address",

      fields: {
        email: [
          "This email address is already registered",
        ],
      },
    });
  });

  it("changes the customer password and rejects the previous password", async () => {
    const email =
      "password-customer@example.com";

    const { agent } =
      await registerTestCustomer({
        email,
      });

    await agent
      .put("/api/account/password")
      .send({
        currentPassword: testPassword,
        newPassword: "NewPassword456",
        confirmPassword:
          "NewPassword456",
      })
      .expect(200, {
        message:
          "Password changed successfully",
      });

    await agent
      .post("/api/auth/logout")
      .expect(200);

    await request(app)
      .post("/api/auth/login")
      .send({
        email,
        password: testPassword,
      })
      .expect(401);

    const loginResponse =
      await request(app)
        .post("/api/auth/login")
        .send({
          email,
          password: "NewPassword456",
        })
        .expect(200);

    expect(
      loginResponse.body.user.email,
    ).toBe(email);
  });

  it("rejects an incorrect current password when changing password", async () => {
    const { agent } =
      await registerTestCustomer({
        email:
          "incorrect-password@example.com",
      });

    const response = await agent
      .put("/api/account/password")
      .send({
        currentPassword:
          "IncorrectPassword123",
        newPassword: "NewPassword456",
        confirmPassword:
          "NewPassword456",
      })
      .expect(401);

    expect(
      response.body.fields.currentPassword,
    ).toEqual([
      "Your current password is incorrect",
    ]);
  });

  it("adds, updates and removes a customer address", async () => {
    const user = await createTestUser({
      email:
        "address-customer@example.com",
    });

    const cookie =
      createAuthenticationCookie(
        user._id,
      );

    const addedResponse =
      await request(app)
        .post("/api/account/addresses")
        .set("Cookie", cookie)
        .send({
          label: "Home",
          recipientName:
            "Address Customer",
          line1: "10 Example Street",
          line2: "",
          city: "London",
          county: "",
          postcode: "SW1A 1AA",
          country: "GB",
          phone: "07123456789",
          isDefault: false,
        })
        .expect(201);

    expect(
      addedResponse.body.address,
    ).toMatchObject({
      id: expect.any(String),
      label: "Home",
      recipientName:
        "Address Customer",
      line1: "10 Example Street",
      city: "London",
      postcode: "SW1A 1AA",
      country: "GB",
      isDefault: true,
    });

    const addressId =
      addedResponse.body.address.id;

    const updatedResponse =
      await request(app)
        .put(
          `/api/account/addresses/${addressId}`,
        )
        .set("Cookie", cookie)
        .send({
          label: "Main home",
          recipientName:
            "Address Customer",
          line1: "25 Updated Road",
          line2: "Flat 4",
          city: "Manchester",
          county:
            "Greater Manchester",
          postcode: "M1 1AA",
          country: "GB",
          phone: "07987654321",
          isDefault: true,
        })
        .expect(200);

    expect(
      updatedResponse.body.address,
    ).toMatchObject({
      id: addressId,
      label: "Main home",
      line1: "25 Updated Road",
      line2: "Flat 4",
      city: "Manchester",
      isDefault: true,
    });

    const accountResponse =
      await request(app)
        .get("/api/account")
        .set("Cookie", cookie)
        .expect(200);

    expect(
      accountResponse.body.user
        .addresses,
    ).toHaveLength(1);

    expect(
      accountResponse.body.user
        .addresses[0].id,
    ).toBe(addressId);

    const deletedResponse =
      await request(app)
        .delete(
          `/api/account/addresses/${addressId}`,
        )
        .set("Cookie", cookie)
        .expect(200);

    expect(
      deletedResponse.body.addresses,
    ).toEqual([]);
  });

  it("does not allow one customer to update another customer's address", async () => {
    const addressOwner =
      await createTestUser({
        email:
          "address-owner@example.com",
      });

    const otherCustomer =
      await createTestUser({
        email:
          "address-stranger@example.com",
      });

    const ownerCookie =
      createAuthenticationCookie(
        addressOwner._id,
      );

    const strangerCookie =
      createAuthenticationCookie(
        otherCustomer._id,
      );

    const addedResponse =
      await request(app)
        .post("/api/account/addresses")
        .set("Cookie", ownerCookie)
        .send({
          label: "Home",
          recipientName:
            "Address Owner",
          line1: "10 Private Street",
          line2: "",
          city: "London",
          county: "",
          postcode: "SW1A 1AA",
          country: "GB",
          phone: "",
          isDefault: true,
        })
        .expect(201);

    const addressId =
      addedResponse.body.address.id;

    await request(app)
      .put(
        `/api/account/addresses/${addressId}`,
      )
      .set("Cookie", strangerCookie)
      .send({
        label: "Stolen address",
        recipientName:
          "Other Customer",
        line1: "99 Wrong Road",
        line2: "",
        city: "London",
        county: "",
        postcode: "E1 1AA",
        country: "GB",
        phone: "",
        isDefault: true,
      })
      .expect(404);

    const ownerAccount =
      await request(app)
        .get("/api/account")
        .set("Cookie", ownerCookie)
        .expect(200);

    expect(
      ownerAccount.body.user
        .addresses[0],
    ).toMatchObject({
      id: addressId,
      label: "Home",
      line1: "10 Private Street",
    });
  });
});
