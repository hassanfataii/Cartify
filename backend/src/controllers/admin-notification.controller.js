import { ObjectId } from "mongodb";

import { getDatabase } from "../config/database.js";

function createHttpError(
  status,
  message,
) {
  const error = new Error(message);
  error.status = status;

  return error;
}

function serializeNotification(
  notification,
) {
  return {
    id:
      notification._id.toString(),

    type:
      notification.type,

    title:
      notification.title,

    message:
      notification.message,

    link:
      notification.link ?? null,

    metadata:
      notification.metadata ?? {},

    isRead:
      Boolean(notification.isRead),

    createdAt:
      notification.createdAt,

    readAt:
      notification.readAt ?? null,
  };
}

export async function getAdminNotifications(
  request,
  response,
) {
  const database = getDatabase();

  const limit = Math.min(
    Math.max(
      Number.parseInt(
        request.query.limit,
        10,
      ) || 20,
      1,
    ),
    100,
  );

  const unreadOnly =
    request.query.unread === "true";

  const filter =
    unreadOnly
      ? {
          isRead: false,
        }
      : {};

  const [
    notifications,
    unreadCount,
  ] = await Promise.all([
    database
      .collection(
        "adminNotifications",
      )
      .find(filter)
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .limit(limit)
      .toArray(),

    database
      .collection(
        "adminNotifications",
      )
      .countDocuments({
        isRead: false,
      }),
  ]);

  response.status(200).json({
    notifications:
      notifications.map(
        serializeNotification,
      ),

    unreadCount,
  });
}

export async function markAdminNotificationRead(
  request,
  response,
) {
  if (
    !ObjectId.isValid(
      request.params.notificationId,
    )
  ) {
    throw createHttpError(
      400,
      "Invalid notification",
    );
  }

  const database = getDatabase();

  const notificationId =
    new ObjectId(
      request.params.notificationId,
    );

  const result =
    await database
      .collection(
        "adminNotifications",
      )
      .findOneAndUpdate(
        {
          _id: notificationId,
        },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
          },
        },
        {
          returnDocument: "after",
        },
      );

  if (!result) {
    throw createHttpError(
      404,
      "Notification not found",
    );
  }

  response.status(200).json({
    notification:
      serializeNotification(
        result,
      ),
  });
}

export async function markAllAdminNotificationsRead(
  request,
  response,
) {
  const database = getDatabase();

  const now = new Date();

  await database
    .collection(
      "adminNotifications",
    )
    .updateMany(
      {
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: now,
        },
      },
    );

  response.status(200).json({
    message:
      "Notifications marked as read",
  });
}