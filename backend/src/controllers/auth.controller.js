import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";

import { getDatabase } from "../config/database.js";
import { sendWelcomeEmail } from "../emails/auth-emails.js";

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
  .regex(/\d/, "Password must contain a number");

const registerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(
      50,
      "First name must contain no more than 50 characters",
    ),

  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(
      50,
      "Last name must contain no more than 50 characters",
    ),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address"),

  phone: z
    .string()
    .trim()
    .regex(
      /^[+\d][\d\s()-]{6,19}$/,
      "Enter a valid phone number",
    )
    .optional()
    .or(z.literal("")),

  password: passwordSchema,
});

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address"),

  password: z
    .string()
    .min(1, "Password is required"),
});

const googleSchema = z.object({ credential: z.string().min(1).max(10000) });
const googleClient = new OAuth2Client();

function createAuthenticationToken(userId) {
  return jwt.sign(
    {},
    process.env.JWT_SECRET,
    {
      subject: userId.toString(),
      expiresIn: "7d",
      algorithm: "HS256",
    },
  );
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

function setAuthenticationCookie(response, token) {
  response.cookie(
    "cartify_token",
    token,
    {
      ...getCookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  );
}

function publicUser(user) {
  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || "",
    role: user.role,
    hasPassword: !user.googleId || user.passwordLoginEnabled === true,
    addresses: Array.isArray(user.addresses)
      ? user.addresses
      : [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt ?? null,
  };
}

function validationResponse(
  response,
  validation,
) {
  return response.status(400).json({
    error: "Please check the submitted details",
    fields:
      validation.error.flatten().fieldErrors,
  });
}

export async function register(request, response) {
  const validation =
    registerSchema.safeParse(request.body);

  if (!validation.success) {
    return validationResponse(
      response,
      validation,
    );
  }

  const database = getDatabase();
  const users = database.collection("users");

  const {
    firstName,
    lastName,
    email,
    phone,
    password,
  } = validation.data;

  const existingUser = await users.findOne({
    email,
  });

  if (existingUser) {
    return response.status(409).json({
      error:
        "An account already exists with this email address",

      fields: {
        email: [
          "This email address is already registered",
        ],
      },
    });
  }

  const now = new Date();
  const passwordHash = await bcrypt.hash(
    password,
    12,
  );

  const user = {
    firstName,
    lastName,
    email,
    phone: phone || "",
    passwordHash,
    role: "customer",
    addresses: [],
    createdAt: now,
    updatedAt: now,
  };

  try {
    const result = await users.insertOne(user);

    user._id = result.insertedId;

    const token =
      createAuthenticationToken(user._id);

    setAuthenticationCookie(response, token);

    // Email delivery must never prevent account
    // creation, so it runs independently.
    void sendWelcomeEmail({ user });

    return response.status(201).json({
      message: "Account created successfully",
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({
        error:
          "An account already exists with this email address",

        fields: {
          email: [
            "This email address is already registered",
          ],
        },
      });
    }

    throw error;
  }
}

export async function login(request, response) {
  const validation =
    loginSchema.safeParse(request.body);

  if (!validation.success) {
    return validationResponse(
      response,
      validation,
    );
  }

  const database = getDatabase();
  const users = database.collection("users");

  const { email, password } = validation.data;

  const user = await users.findOne({ email });

  if (!user) {
    return response.status(401).json({
      error: "Incorrect email address or password",
    });
  }

  const passwordMatches = (!user.googleId || user.passwordLoginEnabled === true) && await bcrypt.compare(
    password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    return response.status(401).json({
      error: "Incorrect email address or password",
    });
  }

  const token =
    createAuthenticationToken(user._id);

  setAuthenticationCookie(response, token);

  return response.status(200).json({
    message: "Logged in successfully",
    user: publicUser(user),
  });
}

export async function logout(request, response) {
  response.clearCookie(
    "cartify_token",
    getCookieOptions(),
  );

  return response.status(200).json({
    message: "Logged out successfully",
  });
}

export async function getCurrentUser(
  request,
  response,
) {
  const database = getDatabase();

  const user = await database
    .collection("users")
    .findOne(
      {
        _id: request.userId,
      },
      {
        projection: {
          passwordHash: 0,
        },
      },
    );

  if (!user) {
    return response.status(404).json({
      error: "User account not found",
    });
  }

  return response.status(200).json({
    user: publicUser(user),
  });
}

export async function googleLogin(request, response) {
  const validation = googleSchema.safeParse(request.body);
  if (!validation.success) return validationResponse(response, validation);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return response.status(503).json({ error: "Google sign-in is not configured yet" });

  let profile;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: validation.data.credential,
      audience: clientId,
    });
    profile = ticket.getPayload();
  } catch {
    return response.status(401).json({ error: "Google sign-in could not be verified. Please try again." });
  }

  if (!profile?.sub || !profile.email || profile.email_verified !== true) {
    return response.status(401).json({ error: "Google did not verify an email address for this account" });
  }

  const email = profile.email.toLowerCase();
  const users = getDatabase().collection("users");
  let user = await users.findOne({ googleId: profile.sub });

  if (!user) {
    // Never grant access to an existing password account based on an email match.
    // The owner can keep signing in with their password until account linking is added.
    if (await users.findOne({ email })) {
      return response.status(409).json({
        error: "An account already uses this email. Sign in with your password for now.",
      });
    }

    const now = new Date();
    user = {
      firstName: (profile.given_name || profile.name || "Customer").slice(0, 50),
      lastName: (profile.family_name || "").slice(0, 50),
      email,
      phone: "",
      passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
      googleId: profile.sub,
      passwordLoginEnabled: false,
      role: "customer",
      addresses: [],
      createdAt: now,
      updatedAt: now,
    };

    try {
      const result = await users.insertOne(user);
      user._id = result.insertedId;
      void sendWelcomeEmail({ user });
    } catch (error) {
      if (error.code !== 11000) throw error;
      user = await users.findOne({ googleId: profile.sub });
      if (!user) return response.status(409).json({ error: "An account already uses this email. Sign in with your password for now." });
    }
  }

  setAuthenticationCookie(response, createAuthenticationToken(user._id));
  return response.status(200).json({ message: "Signed in with Google", user: publicUser(user) });
}
