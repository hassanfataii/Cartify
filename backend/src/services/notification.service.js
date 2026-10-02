import { getDatabase } from "../config/database.js";

export const ADMIN_NOTIFICATION_TYPES = {
  NEW_ORDER: "new_order",
  RETURN_REQUEST: "return_request",
  LOW_STOCK: "low_stock",
};

export async function createAdminNotification({
  type,
  title,
  message,
  link = null,
  metadata = {},
  uniqueKey = null,
}) {
  const database = getDatabase();

  const collection =
    database.collection(
      "adminNotifications",
    );

  const now = new Date();

  const notification = {
    type,
    title,
    message,
    link,
    metadata,
    uniqueKey,
    isRead: false,
    createdAt: now,
    readAt: null,
  };

  if (uniqueKey) {
    const existing =
      await collection.findOne({
        uniqueKey,
      });

    if (existing) {
      return existing;
    }
  }

  const result =
    await collection.insertOne(
      notification,
    );

  return {
    ...notification,
    _id: result.insertedId,
  };
}
