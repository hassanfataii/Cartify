import {
  z,
} from "zod";

import {
  getDatabase,
} from "../config/database.js";

const adminProductQuerySchema =
  z.object({
    q: z
      .string()
      .trim()
      .max(
        100,
        "Search must contain no more than 100 characters",
      )
      .optional(),

    visibility: z
      .enum([
        "all",
        "active",
        "hidden",
      ])
      .default("all"),
  });

function escapeRegularExpression(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

export async function getAdminProducts(
  request,
  response,
) {
  const validation =
    adminProductQuerySchema.safeParse(
      request.query,
    );

  if (!validation.success) {
    return response.status(400).json({
      error:
        "Please check the product filters",

      fields:
        validation.error.flatten()
          .fieldErrors,
    });
  }

  const {
    q,
    visibility,
  } = validation.data;

  const filter = {};

  if (q) {
    const searchExpression =
      new RegExp(
        escapeRegularExpression(q),
        "i",
      );

    filter.$or = [
      {
        title: searchExpression,
      },
      {
        productNumber:
          searchExpression,
      },
    ];
  }

  if (visibility === "active") {
    filter.isActive = true;
  }

  if (visibility === "hidden") {
    filter.isActive = false;
  }

  const database = getDatabase();

  const products = await database
    .collection("products")
    .aggregate([
      {
        $match: filter,
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },
    ])
    .toArray();

  return response.status(200).json({
    products: products.map(
      (product) => ({
        id: product._id.toString(),

        productNumber:
          product.productNumber ?? null,

        title: product.title,
        slug: product.slug,
        description:
          product.description,
        features: product.features,
        specifications: product.specifications,

        category: product.category
          ? {
              id: product.category._id.toString(),
              name: product.category.name,
              slug: product.category.slug,
            }
          : null,

        images: product.images ?? [],
        priceInPence:
          product.priceInPence,
        stock: product.stock,
        isActive: product.isActive,
        isFeatured:
          product.isFeatured,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      }),
    ),

    meta: {
      query: q || "",
      visibility,
      totalProducts: products.length,
    },
  });
}
