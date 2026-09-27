import {
  createHash,
  randomBytes,
} from "node:crypto";

import bcrypt from "bcryptjs";
import { z } from "zod";

import { getDatabase } from "../config/database.js";

import {
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
} from "../emails/password-emails.js";

const RESET_TOKEN_LIFETIME =
  60 * 60 * 1000;

const genericForgottenPasswordResponse = {
  message:
    "If an account exists for that email address, a password reset link has been sent.",
};

const passwordSchema = z
  .string()
  .min(
    8,
    "Password must contain at least 8 characters",
  )
  .max(
    72,
    "Password must contain no more than 72 characters",
  )
  .regex(
    /[a-z]/,
    "Password must contain a lowercase letter",
  )
  .regex(
    /[A-Z]/,
    "Password must contain an uppercase letter",
  )
  .regex(
    /\d/,
    "Password must contain a number",
  );

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address"),
});

const resetPasswordSchema = z.object({
  token: z
    .string()
    .trim()
    .min(20, "Password reset token is invalid"),

  password: passwordSchema,
});

function hashResetToken(token) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function getCookieOptions() {
  const production =
    process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? "none" : "lax",
    path: "/",
  };
}

async function ensureResetTokenIndexes(
  resetTokens,
) {
  await Promise.all([
    resetTokens.createIndex(
      {
        tokenHash: 1,
      },
      {
        unique: true,
      },
    ),

    resetTokens.createIndex(
      {
        expiresAt: 1,
      },
      {
        expireAfterSeconds: 0,
      },
    ),

    resetTokens.createIndex({
      userId: 1,
    }),
  ]);
}

export async function forgotPassword(
  request,
  response,
) {
  const validation =
    forgotPasswordSchema.safeParse(
      request.body,
    );

  if (!validation.success) {
    return response.status(400).json({
      error:
        "Please check the submitted email address",

      fields:
        validation.error.flatten()
          .fieldErrors,
    });
  }

  const database = getDatabase();
  const users =
    database.collection("users");

  const resetTokens =
    database.collection(
      "passwordResetTokens",
    );

  await ensureResetTokenIndexes(
    resetTokens,
  );

  const user = await users.findOne({
    email: validation.data.email,
  });

  // Always return the same response so outsiders
  // cannot discover registered email addresses.
  if (!user) {
    return response
      .status(200)
      .json(
        genericForgottenPasswordResponse,
      );
  }

  const rawToken =
    randomBytes(32).toString("hex");

  const tokenHash =
    hashResetToken(rawToken);

  const now = new Date();

  await resetTokens.deleteMany({
    userId: user._id,
    usedAt: null,
  });

  const resetRequest = {
    userId: user._id,
    tokenHash,
    email: user.email,
    createdAt: now,

    expiresAt: new Date(
      now.getTime() +
        RESET_TOKEN_LIFETIME,
    ),

    usedAt: null,

    requestInformation: {
      ipAddress:
        request.ip ?? null,

      userAgent:
        request.get("user-agent") ??
        null,
    },

    email: {
      status: "pending",
      updatedAt: now,
    },
  };

  const result =
    await resetTokens.insertOne(
      resetRequest,
    );

  const emailResult =
    await sendPasswordResetEmail({
      user,
      token: rawToken,

      resetRequestId:
        result.insertedId.toString(),
    });

  await resetTokens.updateOne(
    {
      _id: result.insertedId,
    },
    {
      $set: {
        "email.status":
          emailResult.sent
            ? "sent"
            : emailResult.skipped
              ? "skipped"
              : "failed",

        "email.resendEmailId":
          emailResult.id ?? null,

        "email.error":
          emailResult.error ||
          emailResult.reason ||
          null,

        "email.updatedAt":
          new Date(),
      },
    },
  );

  return response
    .status(200)
    .json(
      genericForgottenPasswordResponse,
    );
}

export async function resetPassword(
  request,
  response,
) {
  const validation =
    resetPasswordSchema.safeParse(
      request.body,
    );

  if (!validation.success) {
    return response.status(400).json({
      error:
        "Please check the submitted password",

      fields:
        validation.error.flatten()
          .fieldErrors,
    });
  }

  const database = getDatabase();

  const users =
    database.collection("users");

  const resetTokens =
    database.collection(
      "passwordResetTokens",
    );

  await ensureResetTokenIndexes(
    resetTokens,
  );

  const {
    token,
    password,
  } = validation.data;

  const tokenHash =
    hashResetToken(token);

  const passwordHash =
    await bcrypt.hash(password, 12);

  const now = new Date();

  const resetRequest =
    await resetTokens.findOneAndUpdate(
      {
        tokenHash,
        usedAt: null,
        expiresAt: {
          $gt: now,
        },
      },
      {
        $set: {
          usedAt: now,
        },
      },
      {
        returnDocument: "before",
        includeResultMetadata: false,
      },
    );

  if (!resetRequest) {
    return response.status(400).json({
      error:
        "This password reset link is invalid or has expired",
    });
  }

  const user = await users.findOne({
    _id: resetRequest.userId,
  });

  if (!user) {
    return response.status(400).json({
      error:
        "This password reset link is invalid or has expired",
    });
  }

  try {
    await users.updateOne(
      {
        _id: user._id,
      },
      {
        $set: {
          passwordHash,
          passwordChangedAt: now,
          updatedAt: now,
        },
      },
    );
  } catch (error) {
    await resetTokens.updateOne(
      {
        _id: resetRequest._id,
      },
      {
        $set: {
          usedAt: null,
        },
      },
    );

    throw error;
  }

  await resetTokens.deleteMany({
    userId: user._id,
    _id: {
      $ne: resetRequest._id,
    },
  });

  response.clearCookie(
    "cartify_token",
    getCookieOptions(),
  );

  await sendPasswordChangedEmail({
    user,
  });

  return response.status(200).json({
    message:
      "Your password has been reset successfully. You can now log in.",
  });
}