import { ObjectId } from "mongodb";
import { z } from "zod";

import { getDatabase } from "../config/database.js";

const RETURN_STATUSES = [
  "requested",
  "approved",
  "rejected",
  "received",
  "refunded",
  "completed",
  "cancelled",
];

const ALLOWED_TRANSITIONS = {
  requested: [
    "approved",
    "rejected",
  ],

  approved: [
    "received",
  ],

  rejected: [],
  received: [],
  refunded: [],
  completed: [],
  cancelled: [],
};

const updateReturnStatusSchema =
  z.object({
    status: z.enum([
      "approved",
      "rejected",
      "received",
    ]),
  });

function createHttpError(
  status,
  message,
) {
  const error =
    new Error(message);

  error.status =
    status;

  return error;
}

function serializeReturnRequest(
  returnRequest,
  order,
  customer,
) {
  return {
    id:
      returnRequest._id.toString(),

    orderId:
      returnRequest.orderId.toString(),

    orderNumber:
      order?._id
        ?.toString()
        .slice(-8)
        .toUpperCase() ??
      returnRequest.orderId
        .toString()
        .slice(-8)
        .toUpperCase(),

    customer: customer
      ? {
          id:
            customer._id.toString(),

          firstName:
            customer.firstName,

          lastName:
            customer.lastName,

          email:
            customer.email,
        }
      : null,

    items:
      Array.isArray(
        returnRequest.items,
      )
        ? returnRequest.items
        : [],

    reason:
      returnRequest.reason,

    note:
      returnRequest.note ??
      "",

    status:
      returnRequest.status,

    requestedRefundInPence:
      returnRequest
        .requestedRefundInPence ??
      0,

    currency:
      returnRequest.currency ??
      order?.currency ??
      "gbp",

    createdAt:
      returnRequest.createdAt,

    updatedAt:
      returnRequest.updatedAt ??
      null,

    reviewedAt:
      returnRequest.reviewedAt ??
      null,

    receivedAt:
      returnRequest.receivedAt ??
      null,
  };
}

async function loadRelatedRecords(
  returnRequests,
) {
  const database =
    getDatabase();

  const orderIds = [
    ...new Set(
      returnRequests.map(
        (returnRequest) =>
          returnRequest
            .orderId
            .toString(),
      ),
    ),
  ].map(
    (orderId) =>
      new ObjectId(
        orderId,
      ),
  );

  const userIds = [
    ...new Set(
      returnRequests.map(
        (returnRequest) =>
          returnRequest
            .userId
            .toString(),
      ),
    ),
  ].map(
    (userId) =>
      new ObjectId(
        userId,
      ),
  );

  const [
    orders,
    users,
  ] =
    await Promise.all([
      orderIds.length
        ? database
            .collection(
              "orders",
            )
            .find({
              _id: {
                $in:
                  orderIds,
              },
            })
            .toArray()
        : [],

      userIds.length
        ? database
            .collection(
              "users",
            )
            .find(
              {
                _id: {
                  $in:
                    userIds,
                },
              },
              {
                projection: {
                  passwordHash:
                    0,
                },
              },
            )
            .toArray()
        : [],
    ]);

  return {
    orderMap:
      new Map(
        orders.map(
          (order) => [
            order._id.toString(),
            order,
          ],
        ),
      ),

    userMap:
      new Map(
        users.map(
          (user) => [
            user._id.toString(),
            user,
          ],
        ),
      ),
  };
}

async function getStatusCounts(
  collection,
) {
  const grouped =
    await collection
      .aggregate([
        {
          $group: {
            _id:
              "$status",

            count: {
              $sum: 1,
            },
          },
        },
      ])
      .toArray();

  const counts = {
    all: 0,
  };

  RETURN_STATUSES.forEach(
    (status) => {
      counts[status] =
        0;
    },
  );

  grouped.forEach(
    ({
      _id,
      count,
    }) => {
      if (
        _id &&
        Object.hasOwn(
          counts,
          _id,
        )
      ) {
        counts[_id] =
          count;
      }

      counts.all +=
        count;
    },
  );

  return counts;
}

export async function getAdminReturns(
  request,
  response,
) {
  const page =
    Math.max(
      Number.parseInt(
        request.query.page,
        10,
      ) || 1,
      1,
    );

  const limit =
    Math.min(
      Math.max(
        Number.parseInt(
          request.query.limit,
          10,
        ) || 20,
        1,
      ),
      100,
    );

  const status =
    String(
      request.query.status ??
        "",
    ).trim();

  if (
    status &&
    !RETURN_STATUSES.includes(
      status,
    )
  ) {
    throw createHttpError(
      400,
      "Invalid return status",
    );
  }

  const database =
    getDatabase();

  const collection =
    database.collection(
      "returnRequests",
    );

  const filter =
    status
      ? {
          status,
        }
      : {};

  const [
    returnRequests,
    totalReturns,
    statusCounts,
  ] =
    await Promise.all([
      collection
        .find(
          filter,
        )
        .sort({
          createdAt:
            -1,

          _id:
            -1,
        })
        .skip(
          (page - 1) *
            limit,
        )
        .limit(
          limit,
        )
        .toArray(),

      collection.countDocuments(
        filter,
      ),

      getStatusCounts(
        collection,
      ),
    ]);

  const {
    orderMap,
    userMap,
  } =
    await loadRelatedRecords(
      returnRequests,
    );

  return response
    .status(200)
    .json({
      returns:
        returnRequests.map(
          (
            returnRequest,
          ) =>
            serializeReturnRequest(
              returnRequest,

              orderMap.get(
                returnRequest
                  .orderId
                  .toString(),
              ),

              userMap.get(
                returnRequest
                  .userId
                  .toString(),
              ),
            ),
        ),

      statusCounts,

      pagination: {
        page,
        limit,
        totalReturns,

        totalPages:
          Math.max(
            Math.ceil(
              totalReturns /
                limit,
            ),
            1,
          ),
      },
    });
}

export async function updateAdminReturnStatus(
  request,
  response,
) {
  if (
    !ObjectId.isValid(
      request.params.returnId,
    )
  ) {
    throw createHttpError(
      400,
      "Invalid return request",
    );
  }

  const validation =
    updateReturnStatusSchema
      .safeParse(
        request.body,
      );

  if (
    !validation.success
  ) {
    throw createHttpError(
      400,
      "Invalid return status",
    );
  }

  const database =
    getDatabase();

  const collection =
    database.collection(
      "returnRequests",
    );

  const returnId =
    new ObjectId(
      request.params.returnId,
    );

  const returnRequest =
    await collection.findOne(
      {
        _id:
          returnId,
      },
    );

  if (
    !returnRequest
  ) {
    throw createHttpError(
      404,
      "Return request not found",
    );
  }

  const nextStatus =
    validation.data.status;

  const allowed =
    ALLOWED_TRANSITIONS[
      returnRequest.status
    ] ?? [];

  if (
    !allowed.includes(
      nextStatus,
    )
  ) {
    throw createHttpError(
      409,
      `A ${returnRequest.status} return cannot be changed to ${nextStatus}`,
    );
  }

  const now =
    new Date();

  const setFields = {
    status:
      nextStatus,

    updatedAt:
      now,
  };

  if (
    nextStatus ===
      "approved" ||
    nextStatus ===
      "rejected"
  ) {
    setFields.reviewedAt =
      now;
  }

  if (
    nextStatus ===
    "received"
  ) {
    setFields.receivedAt =
      now;
  }

  await collection.updateOne(
    {
      _id:
        returnId,
    },
    {
      $set:
        setFields,

      $push: {
        statusHistory: {
          status:
            nextStatus,

          changedAt:
            now,

          changedBy:
            request.userId,
        },
      },
    },
  );

  return response
    .status(200)
    .json({
      message:
        nextStatus ===
        "received"
          ? "Return marked as received"
          : `Return ${nextStatus}`,
    });
}