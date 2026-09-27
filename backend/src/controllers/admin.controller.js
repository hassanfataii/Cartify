import { ObjectId } from "mongodb";
import { z } from "zod";

import { getDatabase } from "../config/database.js";

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

    customer: order.customer
      ? {
          id: order.customer._id.toString(),
          firstName: order.customer.firstName,
          lastName: order.customer.lastName,
          email: order.customer.email,
        }
      : null,

    items: items.map((item) => ({
      productId: item.productId.toString(),
      title: item.title,
      slug: item.slug,
      image: item.image,
      quantity: item.quantity,
      unitPriceInPence: item.unitPriceInPence,
      lineTotalInPence: item.lineTotalInPence,
    })),

    itemCount: items.reduce(
      (total, item) => total + item.quantity,
      0,
    ),

    subtotalInPence:
      order.subtotalInPence ??
      order.totalInPence,

    totalInPence: order.totalInPence,
    currency: order.currency,
    status: order.status,
    paymentStatus: order.paymentStatus,

    createdAt: order.createdAt,
    updatedAt: order.updatedAt ?? null,
    paidAt: order.paidAt ?? null,
    shippedAt: order.shippedAt ?? null,
    deliveredAt: order.deliveredAt ?? null,
    cancelledAt: order.cancelledAt ?? null,

    statusHistory: Array.isArray(order.statusHistory)
      ? order.statusHistory.map((entry) => ({
          status: entry.status,
          changedAt: entry.changedAt,
          changedBy:
            entry.changedBy?.toString() ?? null,
        }))
      : [],
  };
}

async function findAdminOrder(database, orderId) {
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
          preserveNullAndEmptyArrays: true,
        },
      },
    ])
    .toArray();

  return orders[0] ?? null;
}

export async function getAdminSummary(
  request,
  response,
) {
  const database = getDatabase();

  const [
    customerCount,
    activeProductCount,
    lowStockCount,
    paidOrderCount,
    revenueResult,
    recentOrders,
  ] = await Promise.all([
    database.collection("users").countDocuments({
      role: {
        $ne: "admin",
      },
    }),

    database.collection("products").countDocuments({
      isActive: true,
    }),

    database.collection("products").countDocuments({
      isActive: true,
      stock: {
        $lte: 10,
      },
    }),

    database.collection("orders").countDocuments({
      paymentStatus: "paid",
    }),

    database
      .collection("orders")
      .aggregate([
        {
          $match: {
            paymentStatus: "paid",
          },
        },
        {
          $group: {
            _id: null,
            totalRevenueInPence: {
              $sum: "$totalInPence",
            },
          },
        },
      ])
      .toArray(),

    database
      .collection("orders")
      .aggregate([
        {
          $match: {
            paymentStatus: "paid",
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $limit: 5,
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
  ]);

  response.status(200).json({
    summary: {
      customerCount,
      activeProductCount,
      lowStockCount,
      paidOrderCount,

      totalRevenueInPence:
        revenueResult[0]?.totalRevenueInPence ?? 0,
    },

    recentOrders: recentOrders.map(
      serializeAdminOrder,
    ),
  });
}

export async function getAdminProducts(
  request,
  response,
) {
  const database = getDatabase();

  const products = await database
    .collection("products")
    .aggregate([
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },
    ])
    .toArray();

  response.status(200).json({
    products: products.map((product) => ({
      id: product._id.toString(),
      title: product.title,
      slug: product.slug,
      description: product.description,

      category: product.category
        ? {
            id: product.category._id.toString(),
            name: product.category.name,
            slug: product.category.slug,
          }
        : null,

      images: product.images ?? [],
      priceInPence: product.priceInPence,
      stock: product.stock,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    })),
  });
}

export async function getAdminOrders(
  request,
  response,
) {
  const database = getDatabase();

  const page = Math.max(
    Number.parseInt(request.query.page, 10) || 1,
    1,
  );

  const limit = Math.min(
    Math.max(
      Number.parseInt(request.query.limit, 10) || 20,
      1,
    ),
    50,
  );

  const filter = {
    paymentStatus: "paid",
  };

  if (
    request.query.status &&
    ORDER_STATUSES.includes(request.query.status)
  ) {
    filter.status = request.query.status;
  }

  const skip = (page - 1) * limit;

  const [orders, totalOrders] = await Promise.all([
    database
      .collection("orders")
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

    database
      .collection("orders")
      .countDocuments(filter),
  ]);

  response.status(200).json({
    orders: orders.map(serializeAdminOrder),

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
    updateOrderStatusSchema.safeParse(request.body);

  if (!validation.success) {
    return response.status(400).json({
      error: "Please check the submitted status",

      fields:
        validation.error.flatten().fieldErrors,
    });
  }

  const database = getDatabase();
  const orders = database.collection("orders");
  const objectId = new ObjectId(orderId);

  const existingOrder = await orders.findOne({
    _id: objectId,
  });

  if (!existingOrder) {
    return response.status(404).json({
      error: "Order not found",
    });
  }

  const { status } = validation.data;

  if (existingOrder.status === status) {
    const unchangedOrder = await findAdminOrder(
      database,
      objectId,
    );

    return response.status(200).json({
      message: `Order is already marked as ${status.replaceAll(
        "_",
        " ",
      )}`,

      order: serializeAdminOrder(unchangedOrder),
    });
  }

  const now = new Date();

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
          status,
          changedAt: now,
          changedBy: request.userId,
        },
      },
    },
  );

  const updatedOrder = await findAdminOrder(
    database,
    objectId,
  );

  return response.status(200).json({
    message: `Order status updated to ${status.replaceAll(
      "_",
      " ",
    )}`,

    order: serializeAdminOrder(updatedOrder),
  });
}