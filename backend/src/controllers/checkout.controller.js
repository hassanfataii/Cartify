import { ObjectId } from "mongodb";
import Stripe from "stripe";

import { getDatabase } from "../config/database.js";

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw createHttpError(
      500,
      "Stripe has not been configured",
    );
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function createCheckoutSession(
  request,
  response,
) {
  const addressId = request.body?.addressId;

  if (typeof addressId !== "string" || !ObjectId.isValid(addressId)) {
    throw createHttpError(400, "Select a saved delivery address before checkout");
  }

  const database = getDatabase();
  const stripe = getStripe();

  const userId =
    request.userId instanceof ObjectId
      ? request.userId
      : new ObjectId(request.userId);

  const [user, cart] = await Promise.all([
    database.collection("users").findOne(
      { _id: userId },
      {
        projection: {
          email: 1,
          firstName: 1,
          lastName: 1,
          addresses: 1,
        },
      },
    ),

    database.collection("carts").findOne({ userId }),
  ]);

  if (!user) {
    throw createHttpError(404, "User not found");
  }

  const selectedAddress = (user.addresses ?? []).find(
    (address) => address._id?.toString() === addressId,
  );

  if (!selectedAddress || selectedAddress.country !== "GB") {
    throw createHttpError(400, "Select a valid saved delivery address");
  }

  if (!cart || cart.items.length === 0) {
    throw createHttpError(
      400,
      "Your cart is empty",
    );
  }

  const productIds = cart.items.map(
    (item) => item.productId,
  );

  const products = await database
    .collection("products")
    .find({
      _id: { $in: productIds },
      isActive: true,
    })
    .toArray();

  const productsById = new Map(
    products.map((product) => [
      product._id.toString(),
      product,
    ]),
  );

  const orderItems = cart.items.map((cartItem) => {
    const product = productsById.get(
      cartItem.productId.toString(),
    );

    if (!product) {
      throw createHttpError(
        400,
        "A product in your cart is no longer available",
      );
    }

    if (cartItem.quantity > product.stock) {
      throw createHttpError(
        400,
        `Only ${product.stock} of ${product.title} available`,
      );
    }

    return {
      productId: product._id,
      title: product.title,
      slug: product.slug,
      image: product.images?.[0] ?? null,
      quantity: cartItem.quantity,
      unitPriceInPence: product.priceInPence,
      lineTotalInPence:
        product.priceInPence * cartItem.quantity,
    };
  });

  const subtotalInPence = orderItems.reduce(
    (total, item) => total + item.lineTotalInPence,
    0,
  );

  const order = {
    userId,
    items: orderItems,
    subtotalInPence,
    totalInPence: subtotalInPence,
    currency: "gbp",
    deliveryAddressId: selectedAddress._id,
    shippingDetails: {
      name: selectedAddress.recipientName,
      phone: selectedAddress.phone || null,
      address: {
        line1: selectedAddress.line1,
        line2: selectedAddress.line2 || null,
        city: selectedAddress.city,
        state: selectedAddress.county || null,
        postal_code: selectedAddress.postcode,
        country: selectedAddress.country,
      },
    },
    status: "pending",
    paymentStatus: "unpaid",
    stripeSessionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const orderResult = await database
    .collection("orders")
    .insertOne(order);

  try {
    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

        customer_email: user.email,

        client_reference_id:
          orderResult.insertedId.toString(),

        metadata: {
          orderId: orderResult.insertedId.toString(),
          userId: userId.toString(),
        },

        line_items: orderItems.map((item) => ({
          quantity: item.quantity,

          price_data: {
            currency: "gbp",
            unit_amount: item.unitPriceInPence,

            product_data: {
              name: item.title,
            },
          },
        })),

        billing_address_collection: "required",

        phone_number_collection: {
          enabled: true,
        },

        success_url:
          `${process.env.FRONTEND_URL}` +
          `/checkout/success?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${process.env.FRONTEND_URL}/cart?checkout=cancelled`,
      });

    await database.collection("orders").updateOne(
      { _id: orderResult.insertedId },
      {
        $set: {
          stripeSessionId: session.id,
          updatedAt: new Date(),
        },
      },
    );

    response.status(201).json({
      checkoutUrl: session.url,
    });
  } catch (error) {
    await database.collection("orders").updateOne(
      { _id: orderResult.insertedId },
      {
        $set: {
          status: "checkout_failed",
          updatedAt: new Date(),
        },
      },
    );

    console.error(
      "Stripe Checkout error:",
      error.message,
    );

    throw createHttpError(
      502,
      "Unable to start checkout",
    );
  }
}
