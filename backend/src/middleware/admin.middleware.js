import { getDatabase } from "../config/database.js";

export async function requireAdmin(
  request,
  response,
  next,
) {
  try {
    const user = await getDatabase()
      .collection("users")
      .findOne(
        {
          _id: request.userId,
        },
        {
          projection: {
            role: 1,
          },
        },
      );

    if (!user) {
      return response.status(401).json({
        error: "User account not found",
      });
    }

    if (user.role !== "admin") {
      return response.status(403).json({
        error: "Administrator access required",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}