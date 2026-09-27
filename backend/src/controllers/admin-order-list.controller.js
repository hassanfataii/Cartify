import {
  z,
} from "zod";

import {
  getDatabase,
} from "../config/database.js";

const ORDER_STATUSES = [
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "requires_attention",
];

const orderQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20),

  status: z
    .enum(ORDER_STATUSES)
    .optional(),
});

function serializeAdminOrder(order) {
  const items = Array.isArray(
    order.items,
  )
    ? order.items
    : [];

  return {
    id: order._id.toString(),

    customer: order.customer
      ? {
          id:
            order.customer._id.toString(),

          firstName:
            order.customer.firstName,

          lastName:
            order.customer.lastName,

          email:
            order.customer.email,
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

    totalInPence:
      order.totalInPence,

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

    statusHistory:
      Array.isArray(
        order.statusHistory,
      )
        ? order.statusHistory.map(
            (entry) => ({
              status: entry.status,

              changedAt:
                entry.changedAt,

              changedBy:
                entry.changedBy?.toString() ??
                null,
            }),
          )
        : [],
  };
}

function createEmptyStatusCounts() {
  return {
    all: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    requires_attention: 0,
  };
}

export async function getAdminOrders(
  request,
  response,
) {
  const validation =
    orderQuerySchema.safeParse(
      request.query,
    );

  if (!validation.success) {
    return response.status(400).json({
      error:
        "Please check the order filters",

      fields:
        validation.error.flatten()
          .fieldErrors,
    });
  }

  const {
    page,
    limit,
    status,
  } = validation.data;

  const database = getDatabase();

  const ordersCollection =
    database.collection("orders");

  const filter = {
    paymentStatus: "paid",
  };

  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const [
    orders,
    totalOrders,
    statusResults,
  ] = await Promise.all([
    ordersCollection
      .aggregate([
        {
          $match: filter,
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
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
            preserveNullAndEmptyArrays: true,
          },
        },
      ])
      .toArray(),

    ordersCollection.countDocuments(
      filter,
    ),

    ordersCollection
      .aggregate([
        {
          $match: {
            paymentStatus: "paid",
          },
        },
        {
          $group: {
            _id: "$status",
            count: {
              $sum: 1,
            },
          },
        },
      ])
      .toArray(),
  ]);

  const statusCounts =
    createEmptyStatusCounts();

  for (const result of statusResults) {
    if (
      Object.hasOwn(
        statusCounts,
        result._id,
      )
    ) {
      statusCounts[result._id] =
        result.count;
    }

    statusCounts.all += result.count;
  }

  return response.status(200).json({
    orders: orders.map(
      serializeAdminOrder,
    ),

    statusCounts,

    pagination: {
      page,
      limit,
      totalOrders,

      totalPages: Math.max(
        Math.ceil(
          totalOrders / limit,
        ),
        1,
      ),
    },
  });
}