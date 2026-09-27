import { ObjectId } from "mongodb";
import { z } from "zod";

import { getDatabase } from "../config/database.js";
import { sendOrderStatusEmail } from "../emails/order-status-emails.js";

const ORDER_STATUSES = [
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "requires_attention",
];

const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, {
    error: "Select a valid order status",
  }),
});

function serializeAdminOrder(order) {
  const items = Array.isArray(order.items)
    ? order.items
    : [];

  return {
    id: order._id.toString(),
    orderNumber:
      order.orderNumber ?? null,

    customer: order.customer
      ? {
          id:
            order.customer._id.toString(),

          firstName:
            order.customer.firstName,

          lastName:
            order.customer.lastName,

          email: order.customer.email,
        }
      : null,

    items: items.map((item) => ({
      productId:
        item.productId.toString(),

      title: item.title,
      slug: item.slug,
      image: item.image,
      quantity: item.quantity,

      unitPriceInPence:
        item.unitPriceInPence,

      lineTotalInPence:
        item.lineTotalInPence,
    })),

    itemCount: items.reduce(
      (total, item) =>
        total + item.quantity,
      0,
    ),

    subtotalInPence:
      order.subtotalInPence ??
      order.totalInPence,

    totalInPence: order.totalInPence,
    currency: order.currency,
    status: order.status,

    paymentStatus:
      order.paymentStatus,

    createdAt: order.createdAt,

    updatedAt:
      order.updatedAt ?? null,

    paidAt:
      order.paidAt ?? null,

    shippedAt:
      order.shippedAt ?? null,

    deliveredAt:
      order.deliveredAt ?? null,

    cancelledAt:
      order.cancelledAt ?? null,

    statusHistory: Array.isArray(
      order.statusHistory,
    )
      ? order.statusHistory.map(
          (entry) => ({
            id:
              entry._id?.toString() ??
              null,

            status: entry.status,

            changedAt:
              entry.changedAt,

            changedBy:
              entry.changedBy?.toString() ??
              null,

            emailStatus:
              entry.emailStatus ?? null,
          }),
        )
      : [],
  };
}

async function findAdminOrder(
  database,
  orderId,
) {
  const orders = await database
    .collection("orders")
    .aggregate([
      {
        $match: {
          _id: orderId,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: {
          path: "$customer",

          preserveNullAndEmptyArrays:
            true,
        },
      },
    ])
    .toArray();

  return orders[0] ?? null;
}

function emailResultStatus(result) {
  if (result.sent) {
    return "sent";
  }

  if (result.skipped) {
    return "skipped";
  }

  return "failed";
}

function emailResultError(result) {
  if (result.sent) {
    return null;
  }

  return (
    result.error ||
    result.reason ||
    "Unable to send status email"
  );
}

async function recordEmailResult({
  orders,
  orderId,
  statusChangeId,
  result,
}) {
  const update = {
    "statusHistory.$[entry].emailStatus":
      emailResultStatus(result),

    "statusHistory.$[entry].emailUpdatedAt":
      new Date(),
  };

  if (result.id) {
    update[
      "statusHistory.$[entry].resendEmailId"
    ] = result.id;
  }

  const error =
    emailResultError(result);

  if (error) {
    update[
      "statusHistory.$[entry].emailError"
    ] = String(error);
  }

  await orders.updateOne(
    {
      _id: orderId,
    },
    {
      $set: update,
    },
    {
      arrayFilters: [
        {
          "entry._id": statusChangeId,
        },
      ],
    },
  );
}

export async function updateAdminOrderStatus(
  request,
  response,
) {
  const { orderId } = request.params;

  if (!ObjectId.isValid(orderId)) {
    return response.status(400).json({
      error: "Order ID is invalid",
    });
  }

  const validation =
    updateOrderStatusSchema.safeParse(
      request.body,
    );

  if (!validation.success) {
    return response.status(400).json({
      error:
        "Please check the submitted status",

      fields:
        validation.error.flatten()
          .fieldErrors,
    });
  }

  const database = getDatabase();
  const orders =
    database.collection("orders");

  const objectId =
    new ObjectId(orderId);

  const existingOrder =
    await orders.findOne({
      _id: objectId,
    });

  if (!existingOrder) {
    return response.status(404).json({
      error: "Order not found",
    });
  }

  const { status } = validation.data;

  if (
    existingOrder.status === status
  ) {
    const unchangedOrder =
      await findAdminOrder(
        database,
        objectId,
      );

    return response.status(200).json({
      message:
        `Order is already marked as ` +
        status.replaceAll("_", " "),

      order:
        serializeAdminOrder(
          unchangedOrder,
        ),
    });
  }

  const now = new Date();
  const statusChangeId =
    new ObjectId();

  const statusDates = {};

  if (status === "shipped") {
    statusDates.shippedAt = now;
  }

  if (status === "delivered") {
    statusDates.deliveredAt = now;
  }

  if (status === "cancelled") {
    statusDates.cancelledAt = now;
  }

  await orders.updateOne(
    {
      _id: objectId,
    },
    {
      $set: {
        status,
        statusUpdatedAt: now,
        updatedAt: now,
        ...statusDates,
      },

      $push: {
        statusHistory: {
          _id: statusChangeId,
          status,
          changedAt: now,
          changedBy: request.userId,
          emailStatus: "pending",
        },
      },
    },
  );

  const orderForEmail =
    await findAdminOrder(
      database,
      objectId,
    );

  if (orderForEmail?.customer?.email) {
    const emailResult =
      await sendOrderStatusEmail({
        order: orderForEmail,

        customer: {
          firstName:
            orderForEmail.customer
              .firstName,

          email:
            orderForEmail.customer.email,
        },

        statusChangeId:
          statusChangeId.toString(),
      });

    await recordEmailResult({
      orders,
      orderId: objectId,
      statusChangeId,
      result: emailResult,
    });
  } else {
    await recordEmailResult({
      orders,
      orderId: objectId,
      statusChangeId,

      result: {
        sent: false,
        skipped: true,
        reason:
          "Customer email address is unavailable",
      },
    });
  }

  const updatedOrder =
    await findAdminOrder(
      database,
      objectId,
    );

  return response.status(200).json({
    message:
      `Order status updated to ` +
      status.replaceAll("_", " "),

    order:
      serializeAdminOrder(updatedOrder),
  });
}