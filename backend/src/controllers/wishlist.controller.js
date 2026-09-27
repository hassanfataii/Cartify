import { ObjectId } from "mongodb";

import { getDatabase } from "../config/database.js";

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseProductId(value) {
  if (!ObjectId.isValid(value)) {
    throw createHttpError(400, "Product ID is invalid");
  }

  return new ObjectId(value);
}

async function buildWishlist(userId) {
  const database = getDatabase();

  const wishlist = await database
    .collection("wishlists")
    .findOne({ userId });

  if (!wishlist || wishlist.productIds.length === 0) {
    return {
      items: [],
      itemCount: 0,
    };
  }

  const products = await database
    .collection("products")
    .find({
      _id: {
        $in: wishlist.productIds,
      },
      isActive: true,
    })
    .toArray();

  const productsById = new Map(
    products.map((product) => [
      product._id.toString(),
      product,
    ]),
  );

  const items = wishlist.productIds.flatMap(
    (productId) => {
      const product = productsById.get(
        productId.toString(),
      );

      if (!product) {
        return [];
      }

      return [
        {
          productId: product._id.toString(),
          title: product.title,
          slug: product.slug,
          description: product.description,
          image: product.images?.[0] ?? null,
          priceInPence: product.priceInPence,
          stock: product.stock,
        },
      ];
    },
  );

  return {
    items,
    itemCount: items.length,
  };
}

export async function getWishlist(
  request,
  response,
) {
  const wishlist = await buildWishlist(
    request.userId,
  );

  response.json({ wishlist });
}

export async function addWishlistItem(
  request,
  response,
) {
  const database = getDatabase();
  const productId = parseProductId(
    request.body.productId,
  );

  const product = await database
    .collection("products")
    .findOne({
      _id: productId,
      isActive: true,
    });

  if (!product) {
    throw createHttpError(404, "Product not found");
  }

  await database.collection("wishlists").updateOne(
    {
      userId: request.userId,
    },
    {
      $addToSet: {
        productIds: productId,
      },
      $set: {
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    {
      upsert: true,
    },
  );

  const wishlist = await buildWishlist(
    request.userId,
  );

  response.json({
    message: `${product.title} added to your wishlist`,
    wishlist,
  });
}

export async function removeWishlistItem(
  request,
  response,
) {
  const database = getDatabase();
  const productId = parseProductId(
    request.params.productId,
  );

  const product = await database
    .collection("products")
    .findOne({
      _id: productId,
    });

  await database.collection("wishlists").updateOne(
    {
      userId: request.userId,
    },
    {
      $pull: {
        productIds: productId,
      },
      $set: {
        updatedAt: new Date(),
      },
    },
  );

  const wishlist = await buildWishlist(
    request.userId,
  );

  response.json({
    message: product
      ? `${product.title} removed from your wishlist`
      : "Product removed from your wishlist",

    wishlist,
  });
}