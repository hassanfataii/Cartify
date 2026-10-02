import { ObjectId } from "mongodb";
import { z } from "zod";

import { getDatabase } from "../config/database.js";

const RETURN_REASONS = [
  "changed_mind",
  "wrong_item",
  "damaged",
  "not_as_described",
  "other",
];

const createReturnRequestSchema = z.object({
  reason: z.enum(RETURN_REASONS, {
    error: "Choose a valid return reason",
  }),
  note: z
    .string()
    .trim()
    .max(500, "Return note must be 500 characters or fewer")
    .optional()
    .default(""),
  items: z
    .array(
      z.object({
        productId: z
          .string()
          .regex(/^[a-f0-9]{24}$/i, "Product ID is invalid"),
        quantity: z.coerce
          .number()
          .int()
          .min(1, "Return quantity must be at least 1"),
      }),
    )
    .min(1, "Choose at least one item to return")
    .max(20, "Too many return items were submitted"),
});

function createHttpError(status, message, fields) {
  const error = new Error(message);
  error.status = status;

  if (fields) {
    error.fields = fields;
  }

  return error;
}

function serializeReturnRequest(returnRequest) {
  return {
    id: returnRequest._id.toString(),
    orderId: returnRequest.orderId.toString(),
    reason: returnRequest.reason,
    note: returnRequest.note ?? "",
    status: returnRequest.status,
    requestedRefundInPence:
      returnRequest.requestedRefundInPence ?? 0,
    items: returnRequest.items.map((item) => ({
      productId: item.productId.toString(),
      title: item.title,
      image: item.image,
      quantity: item.quantity,
      unitPriceInPence: item.unitPriceInPence,
      lineTotalInPence: item.lineTotalInPence,
    })),
    createdAt: returnRequest.createdAt,
    updatedAt: returnRequest.updatedAt ?? null,
    reviewedAt: returnRequest.reviewedAt ?? null,
    completedAt: returnRequest.completedAt ?? null,
  };
}

function serializeOrder(order, includeDetails = false) {
  const serializedOrder = {
    id: order._id.toString(),
    orderNumber: order._id.toString().slice(-8).toUpperCase(),

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

function buildReturnEligibility(order, returnRequests) {
  const reservedQuantities = new Map();

  for (const returnRequest of returnRequests) {
    if (
      returnRequest.status === "rejected" ||
      returnRequest.status === "cancelled"
    ) {
      continue;
    }

    for (const item of returnRequest.items) {
      const productId = item.productId.toString();

      reservedQuantities.set(
        productId,
        (reservedQuantities.get(productId) ?? 0) +
          item.quantity,
      );
    }
  }

  const items = order.items.map((item) => {
    const productId = item.productId.toString();

    const alreadyRequested =
      reservedQuantities.get(productId) ?? 0;

    return {
      productId,
      purchasedQuantity: item.quantity,
      alreadyRequested,
      availableQuantity: Math.max(
        item.quantity - alreadyRequested,
        0,
      ),
    };
  });

  const canRequestReturn =
    order.paymentStatus === "paid" &&
    order.status === "delivered" &&
    items.some(
      (item) => item.availableQuantity > 0,
    );

  let message = "";

  if (order.paymentStatus !== "paid") {
    message =
      "Only paid orders can have a return request.";
  } else if (order.status !== "delivered") {
    message =
      "Returns become available after the order is delivered.";
  } else if (
    !items.some(
      (item) => item.availableQuantity > 0,
    )
  ) {
    message =
      "All eligible quantities from this order already have return requests.";
  }

  return {
    canRequestReturn,
    message,
    items,
  };
}

async function findOwnedOrder(
  database,
  orderId,
  userId,
) {
  if (!ObjectId.isValid(orderId)) {
    throw createHttpError(
      400,
      "Order ID is invalid",
    );
  }

  const order = await database
    .collection("orders")
    .findOne({
      _id: new ObjectId(orderId),
      userId,
    });

  if (!order) {
    throw createHttpError(
      404,
      "Order not found",
    );
  }

  return order;
}

async function loadReturnRequests(
  database,
  orderId,
  userId,
) {
  return database
    .collection("returnRequests")
    .find({
      orderId: new ObjectId(orderId),
      userId,
    })
    .sort({
      createdAt: -1,
    })
    .toArray();
}

export async function getOrders(
  request,
  response,
) {
  const database = getDatabase();

  const page = Math.max(
    Number.parseInt(
      request.query.page,
      10,
    ) || 1,
    1,
  );

  const limit = Math.min(
    Math.max(
      Number.parseInt(
        request.query.limit,
        10,
      ) || 10,
      1,
    ),
    25,
  );

  const filter = {
    userId: request.userId,

    // Hide abandoned or failed checkout attempts.
    status: {
      $nin: [
        "checkout_failed",
        "pending",
      ],
    },
  };

  const search = String(
    request.query.search || "",
  )
    .trim()
    .replace(/^#/, "")
    .toLowerCase();

  const sort =
    request.query.sort || "newest";

  if (
    search &&
    !/^[a-f0-9]{1,24}$/.test(search)
  ) {
    throw createHttpError(
      400,
      "Enter a valid order number (letters A–F and numbers)",
    );
  }

  if (
    sort !== "newest" &&
    sort !== "oldest"
  ) {
    throw createHttpError(
      400,
      "Choose newest or oldest first",
    );
  }

  if (search.length === 24) {
    filter._id =
      new ObjectId(search);
  } else if (search) {
    // Match the displayed eight-character number.
    // Every search also retains the customer ownership filter.
    filter.$expr = {
      $regexMatch: {
        input: {
          $substrBytes: [
            {
              $toString: "$_id",
            },
            16,
            8,
          ],
        },
        regex: search,
      },
    };
  }

  const direction =
    sort === "oldest" ? 1 : -1;

  const skip =
    (page - 1) * limit;

  const [
    orders,
    totalOrders,
  ] = await Promise.all([
    database
      .collection("orders")
      .find(filter)
      .sort({
        createdAt: direction,
        _id: direction,
      })
      .skip(skip)
      .limit(limit)
      .toArray(),

    database
      .collection("orders")
      .countDocuments(filter),
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
        Math.ceil(
          totalOrders / limit,
        ),
        1,
      ),
    },
  });
}

export async function getOrderById(
  request,
  response,
) {
  const database = getDatabase();

  const order = await findOwnedOrder(
    database,
    request.params.orderId,
    request.userId,
  );

  const returnRequests =
    await loadReturnRequests(
      database,
      request.params.orderId,
      request.userId,
    );

  response.json({
    order: serializeOrder(
      order,
      true,
    ),

    returnRequests:
      returnRequests.map(
        serializeReturnRequest,
      ),

    returnEligibility:
      buildReturnEligibility(
        order,
        returnRequests,
      ),
  });
}

export async function getOrderReturns(
  request,
  response,
) {
  const database = getDatabase();

  const order = await findOwnedOrder(
    database,
    request.params.orderId,
    request.userId,
  );

  const returnRequests =
    await loadReturnRequests(
      database,
      request.params.orderId,
      request.userId,
    );

  response.status(200).json({
    returnRequests:
      returnRequests.map(
        serializeReturnRequest,
      ),

    returnEligibility:
      buildReturnEligibility(
        order,
        returnRequests,
      ),
  });
}

export async function createReturnRequest(
  request,
  response,
) {
  const validation =
    createReturnRequestSchema.safeParse(
      request.body,
    );

  if (!validation.success) {
    throw createHttpError(
      400,
      "Please check your return request",
      validation.error
        .flatten()
        .fieldErrors,
    );
  }

  const database = getDatabase();

  const order = await findOwnedOrder(
    database,
    request.params.orderId,
    request.userId,
  );

  if (
    order.paymentStatus !== "paid"
  ) {
    throw createHttpError(
      400,
      "Only paid orders can be returned",
    );
  }

  if (
    order.status !== "delivered"
  ) {
    throw createHttpError(
      400,
      "You can request a return after the order is delivered",
    );
  }

  const existingReturnRequests =
    await loadReturnRequests(
      database,
      request.params.orderId,
      request.userId,
    );

  const eligibility =
    buildReturnEligibility(
      order,
      existingReturnRequests,
    );

  const eligibilityByProduct =
    new Map(
      eligibility.items.map(
        (item) => [
          item.productId,
          item,
        ],
      ),
    );

  const seenProductIds =
    new Set();

  const returnItems = [];

  for (
    const requestedItem of validation
      .data.items
  ) {
    const productId =
      requestedItem.productId.toLowerCase();

    if (
      seenProductIds.has(productId)
    ) {
      throw createHttpError(
        400,
        "Each product can only appear once in a return request",
      );
    }

    seenProductIds.add(productId);

    const orderItem =
      order.items.find(
        (item) =>
          item.productId
            .toString()
            .toLowerCase() ===
          productId,
      );

    if (!orderItem) {
      throw createHttpError(
        400,
        "One of the selected products does not belong to this order",
      );
    }

    const itemEligibility =
      eligibilityByProduct.get(
        orderItem.productId.toString(),
      );

    if (
      !itemEligibility ||
      requestedItem.quantity >
        itemEligibility.availableQuantity
    ) {
      throw createHttpError(
        400,
        `${orderItem.title} only has ${
          itemEligibility
            ?.availableQuantity ?? 0
        } item(s) available to return`,
      );
    }

    returnItems.push({
      productId:
        orderItem.productId,

      title:
        orderItem.title,

      slug:
        orderItem.slug,

      image:
        orderItem.image,

      quantity:
        requestedItem.quantity,

      unitPriceInPence:
        orderItem.unitPriceInPence,

      lineTotalInPence:
        orderItem.unitPriceInPence *
        requestedItem.quantity,
    });
  }

  const requestedRefundInPence =
    returnItems.reduce(
      (total, item) =>
        total +
        item.lineTotalInPence,
      0,
    );

  const now = new Date();

  const returnRequest = {
    orderId: order._id,
    userId: request.userId,

    reason:
      validation.data.reason,

    note:
      validation.data.note,

    status:
      "requested",

    requestedRefundInPence,

    currency:
      order.currency,

    items:
      returnItems,

    createdAt:
      now,

    updatedAt:
      now,
  };

  const result = await database
    .collection("returnRequests")
    .insertOne(returnRequest);

  returnRequest._id =
    result.insertedId;

  const updatedReturnRequests = [
    returnRequest,
    ...existingReturnRequests,
  ];

  response.status(201).json({
    message:
      "Return request submitted successfully",

    returnRequest:
      serializeReturnRequest(
        returnRequest,
      ),

    returnEligibility:
      buildReturnEligibility(
        order,
        updatedReturnRequests,
      ),
  });
}