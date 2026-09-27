import { z } from "zod";

import { getDatabase } from "../config/database.js";

const productQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),

  category: z
    .string()
    .trim()
    .max(60)
    .optional(),

  sort: z
    .enum([
      "newest",
      "price-asc",
      "price-desc",
      "title",
    ])
    .default("newest"),

  featured: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),

  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(12),
});

const sortOptions = {
  newest: {
    createdAt: -1,
  },

  "price-asc": {
    priceInPence: 1,
  },

  "price-desc": {
    priceInPence: -1,
  },

  title: {
    title: 1,
  },
};

function escapeRegularExpression(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function categoryLookupStages() {
  return [
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
  ];
}

function productProjection(
  additionalFields = {},
) {
  return {
    _id: 1,
    title: 1,
    slug: 1,
    description: 1,
    features: 1,
    specifications: 1,
    images: 1,
    priceInPence: 1,
    stock: 1,
    isFeatured: 1,
    createdAt: 1,
    updatedAt: 1,

    category: {
      _id: "$category._id",
      name: "$category.name",
      slug: "$category.slug",
    },

    ...additionalFields,
  };
}

export async function getProducts(
  request,
  response,
) {
  const validation =
    productQuerySchema.safeParse(
      request.query,
    );

  if (!validation.success) {
    return response.status(400).json({
      error: "Invalid product query",

      fields:
        validation.error.flatten().fieldErrors,
    });
  }

  const {
    q,
    category,
    sort,
    featured,
    page,
    limit,
  } = validation.data;

  const database = getDatabase();

  const productCollection =
    database.collection("products");

  const filter = {
    isActive: true,
  };

  if (q) {
    const searchExpression = new RegExp(
      escapeRegularExpression(q),
      "i",
    );

    filter.$or = [
      {
        title: searchExpression,
      },
      {
        description: searchExpression,
      },
    ];
  }

  if (typeof featured === "boolean") {
    filter.isFeatured = featured;
  }

  if (category) {
    const matchingCategory = await database
      .collection("categories")
      .findOne({
        slug: category,
        isActive: true,
      });

    if (!matchingCategory) {
      return response.status(200).json({
        data: [],

        pagination: {
          page,
          limit,
          totalItems: 0,
          totalPages: 0,
        },
      });
    }

    filter.categoryId =
      matchingCategory._id;
  }

  const skip = (page - 1) * limit;

  const [products, totalItems] =
    await Promise.all([
      productCollection
        .aggregate([
          {
            $match: filter,
          },
          {
            $sort: sortOptions[sort],
          },
          {
            $skip: skip,
          },
          {
            $limit: limit,
          },

          ...categoryLookupStages(),

          {
            $project: productProjection(),
          },
        ])
        .toArray(),

      productCollection.countDocuments(
        filter,
      ),
    ]);

  return response.status(200).json({
    data: products,

    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(
        totalItems / limit,
      ),
    },
  });
}

export async function getBestSellingProducts(
  request,
  response,
) {
  const database = getDatabase();

  const orders =
    database.collection("orders");

  const products =
    database.collection("products");

  const maximumProducts = 5;

  const purchasedProducts = await orders
    .aggregate([
      {
        $match: {
          paymentStatus: "paid",

          status: {
            $ne: "cancelled",
          },
        },
      },
      {
        $unwind: "$items",
      },
      {
        $group: {
          _id: "$items.productId",

          unitsSold: {
            $sum: "$items.quantity",
          },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: "$product",
      },
      {
        $match: {
          "product.isActive": true,
        },
      },
      {
        $sort: {
          unitsSold: -1,
          _id: 1,
        },
      },
      {
        $limit: maximumProducts,
      },
      {
        $lookup: {
          from: "categories",
          localField: "product.categoryId",
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
      {
        $project: {
          _id: "$product._id",
          title: "$product.title",
          slug: "$product.slug",
          description:
            "$product.description",
          features: "$product.features",
          specifications: "$product.specifications",
          images: "$product.images",
          priceInPence:
            "$product.priceInPence",
          stock: "$product.stock",
          isFeatured:
            "$product.isFeatured",
          createdAt:
            "$product.createdAt",
          updatedAt:
            "$product.updatedAt",

          unitsSold: 1,
          isBestSeller: {
            $literal: true,
          },

          category: {
            _id: "$category._id",
            name: "$category.name",
            slug: "$category.slug",
          },
        },
      },
    ])
    .toArray();

  const remainingSpaces =
    maximumProducts -
    purchasedProducts.length;

  let fallbackProducts = [];

  if (remainingSpaces > 0) {
    const purchasedProductIds =
      purchasedProducts.map(
        (product) => product._id,
      );

    fallbackProducts = await products
      .aggregate([
        {
          $match: {
            isActive: true,

            _id: {
              $nin: purchasedProductIds,
            },
          },
        },
        {
          $sort: {
            isFeatured: -1,
            createdAt: -1,
            title: 1,
          },
        },
        {
          $limit: remainingSpaces,
        },

        ...categoryLookupStages(),

        {
          $project: productProjection({
            unitsSold: {
              $literal: 0,
            },

            isBestSeller: {
              $literal: false,
            },
          }),
        },
      ])
      .toArray();
  }

  const bestSellers = [
    ...purchasedProducts,
    ...fallbackProducts,
  ];

  return response.status(200).json({
    data: bestSellers,

    meta: {
      limit: maximumProducts,
      returned: bestSellers.length,

      calculatedFrom:
        "successfully paid orders",
    },
  });
}

export async function getProductBySlug(
  request,
  response,
) {
  const database = getDatabase();

  const product = await database
    .collection("products")
    .findOne({
      slug: request.params.slug,
      isActive: true,
    });

  if (!product) {
    return response.status(404).json({
      error: "Product not found",
    });
  }

  const category = await database
    .collection("categories")
    .findOne({
      _id: product.categoryId,
      isActive: true,
    });

  return response.status(200).json({
    data: {
      ...product,

      category: category
        ? {
            _id: category._id,
            name: category.name,
            slug: category.slug,
          }
        : null,
    },
  });
}
