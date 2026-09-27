import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export function requireAuthentication(request, response, next) {
  const token = request.cookies?.cartify_token;

  if (!token) {
    return response.status(401).json({
      error: "Authentication required",
    });
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET,
    );

    if (!payload.sub || !ObjectId.isValid(payload.sub)) {
      throw new Error("Invalid token payload");
    }

    request.userId = new ObjectId(payload.sub);

    next();
  } catch {
    return response.status(401).json({
      error: "Your session is invalid or has expired",
    });
  }
}