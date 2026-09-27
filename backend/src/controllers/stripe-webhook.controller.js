import { ObjectId } from "mongodb";
import Stripe from "stripe";

import { getDatabase } from "../config/database.js";
import { sendOrderConfirmationEmail } from "../emails/order-emails.js";

function getStripe() {
  return new Stripe(
    process.env.STRIPE_SECRET_KEY,
  );
}

function emailFailureMessage(result) {
  return (
    result.error ||
    result.reason ||
    "Unable to send order confirmation"
  );
}

async function markConfirmationEmail(
  orders,
  orderId,
  result,
) {
  const now = new Date();

  if (result.sent) {
    await orders.updateOne(
      {
        _id: orderId,
      },
      {
        $set: {
          "orderConfirmationEmail.status":
            "sent",

          "orderConfirmationEmail.resendEmailId":
            result.id,

          "orderConfirmationEmail.sentAt":
            now,

          "orderConfirmationEmail.updatedAt":
            now,
        },

        $unset: {
          "orderConfirmationEmail.error": "",
        },
      },
    );

    return;
  }

  if (result.skipped) {
    await orders.updateOne(
      {
        _id: orderId,
      },
      {
        $set: {
          "orderConfirmationEmail.status":
            "skipped",

          "orderConfirmationEmail.error":
            emailFailureMessage(result),

          "orderConfirmationEmail.updatedAt":
            now,
        },
      },
    );

    return;
  }

  await orders.updateOne(
    {
      _id: orderId,
    },
    {
      $set: {
        "orderConfirmationEmail.status":
          "failed",

        "orderConfirmationEmail.error":
          emailFailureMessage(result),

        "orderConfirmationEmail.updatedAt":
          now,
      },
    },
  );
}

async function sendConfirmationIfNeeded(
  database,
  orderId,
) {
  const orders =
    database.collection("orders");

  const claim = await orders.updateOne(
    {
      _id: orderId,
      paymentStatus: "paid",

      "orderConfirmationEmail.status": {
        $nin: [
          "sending",
          "sent",
          "skipped",
        ],
      },
    },
    {
      $set: {
        "orderConfirmationEmail.status":
          "sending",

        "orderConfirmationEmail.lastAttemptAt":
          new Date(),

        "orderConfirmationEmail.updatedAt":
          new Date(),
      },

      $inc: {
        "orderConfirmationEmail.attempts": 1,
      },
    },
  );

  if (claim.modifiedCount === 0) {
    return;
  }

  const order = await orders.findOne({
    _id: orderId,
  });

  if (!order) {
    return;
  }

  const customer = await database
    .collection("users")
    .findOne(
      {
        _id: order.userId,
      },
      {
        projection: {
          firstName: 1,
          email: 1,
        },
      },
    );

  const recipientEmail =
    customer?.email ||
    order.customerDetails?.email;

  if (!recipientEmail) {
    await markConfirmationEmail(
      orders,
      orderId,
      {
        sent: false,
        skipped: true,
        reason:
          "Customer email address is unavailable",
      },
    );

    return;
  }

  const result =
    await sendOrderConfirmationEmail({
      order,
      customer: {
        firstName:
          customer?.firstName ||
          order.customerDetails?.name ||
          "customer",

        email: recipientEmail,
      },
    });

  await markConfirmationEmail(
    orders,
    orderId,
    result,
  );
}

async function completePaidOrder(
  session,
  eventId,
) {
  const database = getDatabase();
  const orders =
    database.collection("orders");
  const products =
    database.collection("products");

  const orderId =
    session.metadata?.orderId;

  if (
    !orderId ||
    !ObjectId.isValid(orderId)
  ) {
    throw new Error(
      "Stripe session contains an invalid order ID",
    );
  }

  const orderObjectId =
    new ObjectId(orderId);

  const order = await orders.findOne({
    _id: orderObjectId,
  });

  if (!order) {
    throw new Error("Order not found");
  }

  // Stripe may resend a webhook. If payment was
  // already processed, only retry an unfinished
  // confirmation email.
  if (order.paymentStatus === "paid") {
    await sendConfirmationIfNeeded(
      database,
      orderObjectId,
    );

    return;
  }

  if (
    session.amount_total !==
      order.totalInPence ||
    session.currency !== order.currency
  ) {
    await orders.updateOne(
      {
        _id: orderObjectId,
      },
      {
        $set: {
          paymentStatus: "paid",
          status: "requires_attention",

          fulfillmentIssue:
            "Stripe total did not match the order total",

          stripeEventId: eventId,

          stripePaymentIntentId:
            session.payment_intent ?? null,

          updatedAt: new Date(),
        },
      },
    );

    return;
  }

  const claim = await orders.updateOne(
    {
      _id: orderObjectId,
      paymentStatus: "unpaid",
    },
    {
      $set: {
        paymentStatus: "processing",
        updatedAt: new Date(),
      },
    },
  );

  if (claim.modifiedCount === 0) {
    return;
  }

  const reducedStockItems = [];

  try {
    for (const item of order.items) {
      const result =
        await products.updateOne(
          {
            _id: item.productId,
            stock: {
              $gte: item.quantity,
            },
            isActive: true,
          },
          {
            $inc: {
              stock: -item.quantity,
            },

            $set: {
              updatedAt: new Date(),
            },
          },
        );

      if (result.modifiedCount === 0) {
        for (
          const restoredItem
          of reducedStockItems
        ) {
          await products.updateOne(
            {
              _id: restoredItem.productId,
            },
            {
              $inc: {
                stock:
                  restoredItem.quantity,
              },

              $set: {
                updatedAt: new Date(),
              },
            },
          );
        }

        await orders.updateOne(
          {
            _id: orderObjectId,
          },
          {
            $set: {
              paymentStatus: "paid",
              status: "requires_attention",

              fulfillmentIssue:
                `${item.title} no longer has ` +
                "enough stock",

              stripeEventId: eventId,

              stripePaymentIntentId:
                session.payment_intent ??
                null,

              updatedAt: new Date(),
            },
          },
        );

        return;
      }

      reducedStockItems.push(item);
    }

    const now = new Date();

    await orders.updateOne(
      {
        _id: orderObjectId,
      },
      {
        $set: {
          paymentStatus: "paid",
          status: "processing",
          stripeEventId: eventId,

          stripePaymentIntentId:
            session.payment_intent ?? null,

          customerDetails:
            session.customer_details ??
            null,

          shippingDetails:
            order.shippingDetails ??
            session.collected_information?.shipping_details ??
            null,

          paidAt: now,
          updatedAt: now,

          orderConfirmationEmail: {
            status: "pending",
            attempts: 0,
            createdAt: now,
            updatedAt: now,
          },
        },
      },
    );

    const purchasedProductIds =
      order.items.map(
        (item) => item.productId,
      );

    await database
      .collection("carts")
      .updateOne(
        {
          userId: order.userId,
        },
        {
          $pull: {
            items: {
              productId: {
                $in: purchasedProductIds,
              },
            },
          },

          $set: {
            updatedAt: now,
          },
        },
      );

    await sendConfirmationIfNeeded(
      database,
      orderObjectId,
    );
  } catch (error) {
    for (
      const restoredItem
      of reducedStockItems
    ) {
      await products.updateOne(
        {
          _id: restoredItem.productId,
        },
        {
          $inc: {
            stock:
              restoredItem.quantity,
          },

          $set: {
            updatedAt: new Date(),
          },
        },
      );
    }

    await orders.updateOne(
      {
        _id: orderObjectId,
      },
      {
        $set: {
          paymentStatus: "unpaid",
          status: "pending",
          updatedAt: new Date(),
        },
      },
    );

    throw error;
  }
}

export async function handleStripeWebhook(
  request,
  response,
) {
  const signature =
    request.headers["stripe-signature"];

  if (!signature) {
    return response.status(400).json({
      error: "Stripe signature missing",
    });
  }

  if (
    !process.env.STRIPE_WEBHOOK_SECRET
  ) {
    return response.status(500).json({
      error:
        "Stripe webhook is not configured",
    });
  }

  let event;

  try {
    event =
      getStripe().webhooks.constructEvent(
        request.body,
        signature,
        process.env
          .STRIPE_WEBHOOK_SECRET,
      );
  } catch (error) {
    console.error(
      "Stripe signature verification failed:",
      error.message,
    );

    return response.status(400).json({
      error:
        "Invalid Stripe webhook signature",
    });
  }

  try {
    if (
      event.type ===
      "checkout.session.completed"
    ) {
      const session =
        event.data.object;

      if (
        session.payment_status ===
        "paid"
      ) {
        await completePaidOrder(
          session,
          event.id,
        );
      }
    }

    return response.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Stripe webhook processing failed:",
      error,
    );

    return response.status(500).json({
      error:
        "Webhook processing failed",
    });
  }
}
