import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { z } from "zod";

import {
  getDatabase,
} from "../config/database.js";

import {
  sendEmailChangeNotifications,
} from "../emails/account-emails.js";

import {
  sendPasswordChangedEmail,
} from "../emails/password-emails.js";

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

const profileSchema = z.object({
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

  currentPassword: z
    .string()
    .optional()
    .or(z.literal("")),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional().default(""),

    newPassword: passwordSchema,

    confirmPassword: z
      .string()
      .min(
        1,
        "Confirm your new password",
      ),
  })
  .superRefine((data, context) => {
    if (
      data.newPassword !==
      data.confirmPassword
    ) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message:
          "The new passwords do not match",
      });
    }

    if (
      data.newPassword ===
      data.currentPassword
    ) {
      context.addIssue({
        code: "custom",
        path: ["newPassword"],
        message:
          "Your new password must be different",
      });
    }
  });

const addressSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Address label is required")
    .max(
      40,
      "Address label must contain no more than 40 characters",
    ),

  recipientName: z
    .string()
    .trim()
    .min(2, "Recipient name is required")
    .max(
      100,
      "Recipient name is too long",
    ),

  line1: z
    .string()
    .trim()
    .min(
      3,
      "Address line one is required",
    )
    .max(
      120,
      "Address line one is too long",
    ),

  line2: z
    .string()
    .trim()
    .max(
      120,
      "Address line two is too long",
    )
    .optional()
    .or(z.literal("")),

  city: z
    .string()
    .trim()
    .min(2, "Town or city is required")
    .max(
      80,
      "Town or city is too long",
    ),

  county: z
    .string()
    .trim()
    .max(
      80,
      "County is too long",
    )
    .optional()
    .or(z.literal("")),

  postcode: z
    .string()
    .trim()
    .min(3, "Postcode is required")
    .max(12, "Postcode is too long"),

  country: z
    .string()
    .trim()
    .length(
      2,
      "Use a two-letter country code",
    )
    .transform((value) =>
      value.toUpperCase(),
    )
    .default("GB"),

  phone: z
    .string()
    .trim()
    .regex(
      /^[+\d][\d\s()-]{6,19}$/,
      "Enter a valid phone number",
    )
    .optional()
    .or(z.literal("")),

  isDefault:
    z.boolean().default(false),
});

function createHttpError(
  status,
  message,
) {
  const error = new Error(message);
  error.status = status;

  return error;
}

function validationResponse(
  response,
  validation,
) {
  return response.status(400).json({
    error:
      "Please check the submitted details",

    fields:
      validation.error.flatten()
        .fieldErrors,
  });
}

function serializeAddress(address) {
  return {
    id: address._id.toString(),
    label: address.label,

    recipientName:
      address.recipientName,

    line1: address.line1,
    line2: address.line2 || "",
    city: address.city,
    county: address.county || "",
    postcode: address.postcode,
    country: address.country,
    phone: address.phone || "",
    isDefault: address.isDefault,
  };
}

function serializeUser(user) {
  const addresses = Array.isArray(
    user.addresses,
  )
    ? user.addresses
    : [];

  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || "",
    role: user.role,
    hasPassword: !user.googleId || user.passwordLoginEnabled === true,

    addresses: addresses.map(
      serializeAddress,
    ),

    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function findCurrentUser(
  database,
  userId,
) {
  const user = await database
    .collection("users")
    .findOne({
      _id: userId,
    });

  if (!user) {
    throw createHttpError(
      404,
      "User account not found",
    );
  }

  return user;
}

function ensureDefaultAddress(addresses) {
  if (addresses.length === 0) {
    return addresses;
  }

  const hasDefaultAddress =
    addresses.some(
      (address) =>
        address.isDefault,
    );

  if (!hasDefaultAddress) {
    addresses[0] = {
      ...addresses[0],
      isDefault: true,
    };
  }

  return addresses;
}

export async function getAccount(
  request,
  response,
) {
  const database = getDatabase();

  const user = await findCurrentUser(
    database,
    request.userId,
  );

  return response.status(200).json({
    user: serializeUser(user),
  });
}

export async function updateProfile(
  request,
  response,
) {
  const validation =
    profileSchema.safeParse(
      request.body,
    );

  if (!validation.success) {
    return validationResponse(
      response,
      validation,
    );
  }

  const database = getDatabase();
  const users =
    database.collection("users");

  const user = await findCurrentUser(
    database,
    request.userId,
  );

  const {
    firstName,
    lastName,
    email,
    phone,
    currentPassword,
  } = validation.data;

  const emailChanged =
    email !== user.email;

  if (emailChanged) {
    if (!currentPassword) {
      return response.status(400).json({
        error:
          "Enter your current password to change your email address",

        fields: {
          currentPassword: [
            "Your current password is required",
          ],
        },
      });
    }

    const passwordMatches =
      await bcrypt.compare(
        currentPassword,
        user.passwordHash,
      );

    if (!passwordMatches) {
      return response.status(401).json({
        error:
          "Your current password is incorrect",

        fields: {
          currentPassword: [
            "Your current password is incorrect",
          ],
        },
      });
    }

    const existingUser =
      await users.findOne({
        email,

        _id: {
          $ne: request.userId,
        },
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
  }

  const changedAt = new Date();

  const updates = {
    firstName,
    lastName,
    email,
    phone: phone || "",
    updatedAt: changedAt,
  };

  const updateOperation = {
    $set: updates,
  };

  if (emailChanged) {
    updateOperation.$push = {
      emailChangeHistory: {
        _id: new ObjectId(),
        previousEmail: user.email,
        newEmail: email,
        changedAt,
      },
    };
  }

  try {
    await users.updateOne(
      {
        _id: request.userId,
      },
      updateOperation,
    );
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

  if (emailChanged) {
    await database
      .collection("passwordResetTokens")
      .deleteMany({
        userId: request.userId,
      });

    await sendEmailChangeNotifications({
      userId:
        request.userId.toString(),

      firstName,

      oldEmail: user.email,
      newEmail: email,
      changedAt,
    });
  }

  return response.status(200).json({
    message:
      "Account details updated successfully",

    user: serializeUser({
      ...user,
      ...updates,
    }),
  });
}

export async function changePassword(
  request,
  response,
) {
  const validation =
    changePasswordSchema.safeParse(
      request.body,
    );

  if (!validation.success) {
    return validationResponse(
      response,
      validation,
    );
  }

  const database = getDatabase();

  const user = await findCurrentUser(
    database,
    request.userId,
  );

  const {
    currentPassword,
    newPassword,
  } = validation.data;

  const passwordMatches =
    user.googleId && user.passwordLoginEnabled !== true
      ? true
      : Boolean(currentPassword) && await bcrypt.compare(
          currentPassword,
          user.passwordHash,
        );

  if (!passwordMatches) {
    return response.status(401).json({
      error:
        "Your current password is incorrect",

      fields: {
        currentPassword: [
          "Your current password is incorrect",
        ],
      },
    });
  }

  const passwordHash =
    await bcrypt.hash(
      newPassword,
      12,
    );

  const changedAt = new Date();

  await database
    .collection("users")
    .updateOne(
      {
        _id: request.userId,
      },
      {
        $set: {
          passwordHash,
          passwordLoginEnabled: true,
          passwordChangedAt:
            changedAt,
          updatedAt: changedAt,
        },
      },
    );

  await database
    .collection("passwordResetTokens")
    .deleteMany({
      userId: request.userId,
    });

  await sendPasswordChangedEmail({
    user: {
      ...user,
      passwordHash,
      passwordChangedAt:
        changedAt,
      updatedAt: changedAt,
    },
  });

  return response.status(200).json({
    message:
      "Password changed successfully",
  });
}

export async function addAddress(
  request,
  response,
) {
  const validation =
    addressSchema.safeParse(
      request.body,
    );

  if (!validation.success) {
    return validationResponse(
      response,
      validation,
    );
  }

  const database = getDatabase();

  const user = await findCurrentUser(
    database,
    request.userId,
  );

  const existingAddresses =
    Array.isArray(user.addresses)
      ? user.addresses
      : [];

  const addressId =
    new ObjectId();

  const makeDefault =
    validation.data.isDefault ||
    existingAddresses.length === 0;

  const now = new Date();

  const newAddress = {
    _id: addressId,
    ...validation.data,
    line2:
      validation.data.line2 || "",
    county:
      validation.data.county || "",
    phone:
      validation.data.phone || "",
    isDefault: makeDefault,
    createdAt: now,
    updatedAt: now,
  };

  const addresses = makeDefault
    ? existingAddresses.map(
        (address) => ({
          ...address,
          isDefault: false,
        }),
      )
    : [...existingAddresses];

  addresses.push(newAddress);

  await database
    .collection("users")
    .updateOne(
      {
        _id: request.userId,
      },
      {
        $set: {
          addresses,
          updatedAt: now,
        },
      },
    );

  return response.status(201).json({
    message:
      "Address added successfully",

    address:
      serializeAddress(newAddress),

    addresses: addresses.map(
      serializeAddress,
    ),
  });
}

export async function updateAddress(
  request,
  response,
) {
  if (
    !ObjectId.isValid(
      request.params.addressId,
    )
  ) {
    throw createHttpError(
      400,
      "Address ID is invalid",
    );
  }

  const validation =
    addressSchema.safeParse(
      request.body,
    );

  if (!validation.success) {
    return validationResponse(
      response,
      validation,
    );
  }

  const database = getDatabase();

  const user = await findCurrentUser(
    database,
    request.userId,
  );

  const addresses = Array.isArray(
    user.addresses,
  )
    ? user.addresses
    : [];

  const addressId = new ObjectId(
    request.params.addressId,
  );

  const addressIndex =
    addresses.findIndex(
      (address) =>
        address._id.equals(addressId),
    );

  if (addressIndex === -1) {
    throw createHttpError(
      404,
      "Address not found",
    );
  }

  const currentAddress =
    addresses[addressIndex];

  const makeDefault =
    validation.data.isDefault ||
    currentAddress.isDefault;

  const now = new Date();

  let updatedAddresses =
    addresses.map(
      (address, index) => {
        if (index === addressIndex) {
          return {
            ...currentAddress,
            ...validation.data,

            line2:
              validation.data.line2 ||
              "",

            county:
              validation.data.county ||
              "",

            phone:
              validation.data.phone ||
              "",

            isDefault: makeDefault,
            updatedAt: now,
          };
        }

        if (
          validation.data.isDefault
        ) {
          return {
            ...address,
            isDefault: false,
          };
        }

        return address;
      },
    );

  updatedAddresses =
    ensureDefaultAddress(
      updatedAddresses,
    );

  await database
    .collection("users")
    .updateOne(
      {
        _id: request.userId,
      },
      {
        $set: {
          addresses:
            updatedAddresses,

          updatedAt: now,
        },
      },
    );

  return response.status(200).json({
    message:
      "Address updated successfully",

    address: serializeAddress(
      updatedAddresses[addressIndex],
    ),

    addresses:
      updatedAddresses.map(
        serializeAddress,
      ),
  });
}

export async function deleteAddress(
  request,
  response,
) {
  if (
    !ObjectId.isValid(
      request.params.addressId,
    )
  ) {
    throw createHttpError(
      400,
      "Address ID is invalid",
    );
  }

  const database = getDatabase();

  const user = await findCurrentUser(
    database,
    request.userId,
  );

  const addresses = Array.isArray(
    user.addresses,
  )
    ? user.addresses
    : [];

  const addressId = new ObjectId(
    request.params.addressId,
  );

  const addressExists =
    addresses.some(
      (address) =>
        address._id.equals(addressId),
    );

  if (!addressExists) {
    throw createHttpError(
      404,
      "Address not found",
    );
  }

  const remainingAddresses =
    ensureDefaultAddress(
      addresses.filter(
        (address) =>
          !address._id.equals(addressId),
      ),
    );

  await database
    .collection("users")
    .updateOne(
      {
        _id: request.userId,
      },
      {
        $set: {
          addresses:
            remainingAddresses,

          updatedAt: new Date(),
        },
      },
    );

  return response.status(200).json({
    message:
      "Address removed successfully",

    addresses:
      remainingAddresses.map(
        serializeAddress,
      ),
  });
}
