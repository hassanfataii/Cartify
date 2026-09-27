import { ObjectId } from "mongodb";

import { getDatabase } from "../config/database.js";

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function serializeOrder(order, includeDetails = false) {
  const serializedOrder = {
    id: order._id.toString(),

    items: order.items.map((item) => ({
      productId: item.productId.toString(),
      title: item.title,
      slug: item.slug,
      image: item.image,
      quantity: item.quantity,
      unitPriceInPence: item.unitPriceInPence,
      lineTotalInPence: item.lineTotalInPence,
    })),

    itemCount: order.items.reduce(
      (total, item) => total + item.quantity,
      0,
    ),

    subtotalInPence: order.subtotalInPence,
    totalInPence: order.totalInPence,
    currency: order.currency,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    paidAt: order.paidAt ?? null,
  };

  if (includeDetails) {
    serializedOrder.customerDetails =
      order.customerDetails ?? null;

    serializedOrder.shippingDetails =
      order.shippingDetails ?? null;

    serializedOrder.stripePaymentIntentId =
      order.stripePaymentIntentId ?? null;

    serializedOrder.fulfillmentIssue =
      order.fulfillmentIssue ?? null;
  }

  return serializedOrder;
}

export async function getOrders(request, response) {
  const database = getDatabase();

  const page = Math.max(
    Number.parseInt(request.query.page, 10) || 1,
    1,
  );

  const limit = Math.min(
    Math.max(
      Number.parseInt(request.query.limit, 10) || 10,
      1,
    ),
    25,
  );

  const filter = {
    userId: request.userId,

    // Do not show abandoned or failed checkout attempts.
    status: {
      $nin: ["checkout_failed", "pending"],
    },
  };

  const skip = (page - 1) * limit;

  const [orders, totalOrders] = await Promise.all([
    database
      .collection("orders")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),

    database.collection("orders").countDocuments(filter),
  ]);

  response.json({
    orders: orders.map((order) =>
      serializeOrder(order),
    ),

    pagination: {
      page,
      limit,
      totalOrders,
      totalPages: Math.max(
        Math.ceil(totalOrders / limit),
        1,
      ),
    },
  });
}

export async function getOrderById(
  request,
  response,
) {
  if (!ObjectId.isValid(request.params.orderId)) {
    throw createHttpError(400, "Order ID is invalid");
  }

  const database = getDatabase();

  const order = await database
    .collection("orders")
    .findOne({
      _id: new ObjectId(request.params.orderId),
      userId: request.userId,
    });

  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  response.json({
    order: serializeOrder(order, true),
  });
}