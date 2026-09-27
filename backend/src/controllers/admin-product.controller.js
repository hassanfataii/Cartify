import { ObjectId } from "mongodb";
import { z } from "zod";

import { getDatabase } from "../config/database.js";
import {
  createUniqueProductNumber,
} from "../utils/product-number.js";

const productSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Product title is required")
    .max(120, "Product title is too long"),

  description: z
    .string()
    .trim()
    .min(
      10,
      "Description must contain at least 10 characters",
    )
    .max(2000, "Description is too long"),

  features: z.array(
    z.string().trim().min(1, "Feature cannot be empty").max(200),
  ).max(12, "Add no more than 12 features").default([]),

  specifications: z.array(
    z.object({
      label: z.string().trim().min(1, "Specification name is required").max(60),
      value: z.string().trim().min(1, "Specification value is required").max(300),
    }),
  ).max(20, "Add no more than 20 specifications").default([]),

  categoryId: z
    .string()
    .refine(
      ObjectId.isValid,
      "Select a valid category",
    ),

  images: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Image path cannot be empty"),
    )
    .min(1, "Add at least one product image")
    .max(
      8,
      "A product can have no more than 8 images",
    ),

  priceInPence: z
    .number()
    .int("Price must be a whole number of pence")
    .positive("Price must be greater than zero"),

  stock: z
    .number()
    .int("Stock must be a whole number")
    .min(0, "Stock cannot be negative"),

  isActive: z.boolean(),
  isFeatured: z.boolean(),
});

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;

  return error;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function createUniqueSlug(
  products,
  title,
  excludedProductId = null,
) {
  const baseSlug = slugify(title) || "product";

  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const filter = { slug };

    if (excludedProductId) {
      filter._id = {
        $ne: excludedProductId,
      };
    }

    const existingProduct = await products.findOne(
      filter,
      {
        projection: {
          _id: 1,
        },
      },
    );

    if (!existingProduct) {
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function validationResponse(response, validation) {
  return response.status(400).json({
    error: "Please check the product details",
    fields: validation.error.flatten().fieldErrors,
  });
}

function serializeProduct(product) {
  return {
    id: product._id.toString(),
    productNumber: product.productNumber ?? null,
    title: product.title,
    slug: product.slug,
    description: product.description,
    features: product.features ?? [],
    specifications: product.specifications ?? [],
    categoryId: product.categoryId.toString(),
    images: product.images,
    priceInPence: product.priceInPence,
    stock: product.stock,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

async function verifyCategory(
  database,
  categoryId,
) {
  const category = await database
    .collection("categories")
    .findOne({
      _id: categoryId,
      isActive: true,
    });

  if (!category) {
    throw createHttpError(
      400,
      "The selected category does not exist",
    );
  }
}

export async function createAdminProduct(
  request,
  response,
) {
  const validation = productSchema.safeParse(
    request.body,
  );

  if (!validation.success) {
    return validationResponse(response, validation);
  }

  const database = getDatabase();
  const products = database.collection("products");

  const data = validation.data;
  const categoryId = new ObjectId(data.categoryId);

  await verifyCategory(database, categoryId);

  const now = new Date();

  const [slug, productNumber] = await Promise.all([
    createUniqueSlug(products, data.title),
    createUniqueProductNumber(products),
  ]);

  const product = {
    productNumber,
    title: data.title,
    slug,
    description: data.description,
    features: data.features,
    specifications: data.specifications,
    categoryId,
    images: data.images,
    priceInPence: data.priceInPence,
    stock: data.stock,
    isActive: data.isActive,
    isFeatured: data.isFeatured,
    createdAt: now,
    updatedAt: now,
  };

  const result = await products.insertOne(product);

  product._id = result.insertedId;

  return response.status(201).json({
    message: "Product created successfully",
    product: serializeProduct(product),
  });
}

export async function updateAdminProduct(
  request,
  response,
) {
  if (
    !ObjectId.isValid(request.params.productId)
  ) {
    throw createHttpError(
      400,
      "Product ID is invalid",
    );
  }

  const validation = productSchema.safeParse(
    request.body,
  );

  if (!validation.success) {
    return validationResponse(response, validation);
  }

  const database = getDatabase();
  const products = database.collection("products");

  const productId = new ObjectId(
    request.params.productId,
  );

  const existingProduct = await products.findOne({
    _id: productId,
  });

  if (!existingProduct) {
    throw createHttpError(
      404,
      "Product not found",
    );
  }

  const data = validation.data;
  const categoryId = new ObjectId(data.categoryId);

  await verifyCategory(database, categoryId);

  const slug =
    data.title === existingProduct.title
      ? existingProduct.slug
      : await createUniqueSlug(
          products,
          data.title,
          productId,
        );

  const productNumber =
    existingProduct.productNumber ??
    await createUniqueProductNumber(products);

  const updates = {
    productNumber,
    title: data.title,
    slug,
    description: data.description,
    features: data.features,
    specifications: data.specifications,
    categoryId,
    images: data.images,
    priceInPence: data.priceInPence,
    stock: data.stock,
    isActive: data.isActive,
    isFeatured: data.isFeatured,
    updatedAt: new Date(),
  };

  await products.updateOne(
    {
      _id: productId,
    },
    {
      $set: updates,
    },
  );

  return response.status(200).json({
    message: "Product updated successfully",

    product: serializeProduct({
      ...existingProduct,
      ...updates,
    }),
  });
}
