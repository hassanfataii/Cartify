import { ObjectId } from "mongodb";

import { getDatabase } from "../config/database.js";

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function toObjectId(value, label = "ID") {
  if (!ObjectId.isValid(value)) {
    throw createHttpError(400, `${label} is invalid`);
  }

  return new ObjectId(value);
}

async function buildCartResponse(userId) {
  const database = getDatabase();

  const cart = await database.collection("carts").findOne({
    userId,
  });

  if (!cart || cart.items.length === 0) {
    return {
      id: cart?._id.toString() ?? null,
      items: [],
      itemCount: 0,
      subtotalInPence: 0,
    };
  }

  const productIds = cart.items.map((item) => item.productId);

  const products = await database
    .collection("products")
    .find({
      _id: { $in: productIds },
      isActive: true,
    })
    .toArray();

  const productsById = new Map(
    products.map((product) => [
      product._id.toString(),
      product,
    ]),
  );

  const items = cart.items.flatMap((item) => {
    const product = productsById.get(item.productId.toString());

    if (!product) {
      return [];
    }

    const quantity = Math.min(item.quantity, product.stock);

    return [
      {
        productId: product._id.toString(),
        title: product.title,
        slug: product.slug,
        image: product.images?.[0] ?? null,
        priceInPence: product.priceInPence,
        stock: product.stock,
        quantity,
        lineTotalInPence:
          product.priceInPence * quantity,
      },
    ];
  });

  return {
    id: cart._id.toString(),
    items,
    itemCount: items.reduce(
      (total, item) => total + item.quantity,
      0,
    ),
    subtotalInPence: items.reduce(
      (total, item) => total + item.lineTotalInPence,
      0,
    ),
  };
}

export async function getCart(request, response) {
  const userId = toObjectId(request.userId, "User ID");
  const cart = await buildCartResponse(userId);

  response.json({ cart });
}

export async function addCartItem(request, response) {
  const database = getDatabase();
  const userId = toObjectId(request.userId, "User ID");
  const productId = toObjectId(
    request.body.productId,
    "Product ID",
  );

  const quantity = Number(request.body.quantity ?? 1);

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw createHttpError(
      400,
      "Quantity must be a positive whole number",
    );
  }

  const product = await database
    .collection("products")
    .findOne({
      _id: productId,
      isActive: true,
    });

  if (!product) {
    throw createHttpError(404, "Product not found");
  }

  if (product.stock < 1) {
    throw createHttpError(400, "This product is out of stock");
  }

  const carts = database.collection("carts");

  let cart = await carts.findOne({ userId });

  if (!cart) {
    cart = {
      userId,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await carts.insertOne(cart);
    cart._id = result.insertedId;
  }

  const existingItem = cart.items.find((item) =>
    item.productId.equals(productId),
  );

  const nextQuantity =
    (existingItem?.quantity ?? 0) + quantity;

  if (nextQuantity > product.stock) {
    throw createHttpError(
      400,
      `Only ${product.stock} available`,
    );
  }

  if (existingItem) {
    await carts.updateOne(
      {
        _id: cart._id,
        "items.productId": productId,
      },
      {
        $set: {
          "items.$.quantity": nextQuantity,
          updatedAt: new Date(),
        },
      },
    );
  } else {
    await carts.updateOne(
      { _id: cart._id },
      {
        $push: {
          items: {
            productId,
            quantity,
          },
        },
        $set: {
          updatedAt: new Date(),
        },
      },
    );
  }

  const updatedCart = await buildCartResponse(userId);

  response.status(200).json({
    message: `${product.title} added to your cart`,
    cart: updatedCart,
  });
}

export async function updateCartItem(request, response) {
  const database = getDatabase();
  const userId = toObjectId(request.userId, "User ID");
  const productId = toObjectId(
    request.params.productId,
    "Product ID",
  );

  const quantity = Number(request.body.quantity);

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw createHttpError(
      400,
      "Quantity must be a positive whole number",
    );
  }

  const product = await database
    .collection("products")
    .findOne({
      _id: productId,
      isActive: true,
    });

  if (!product) {
    throw createHttpError(404, "Product not found");
  }

  if (quantity > product.stock) {
    throw createHttpError(
      400,
      `Only ${product.stock} available`,
    );
  }

  const result = await database.collection("carts").updateOne(
    {
      userId,
      "items.productId": productId,
    },
    {
      $set: {
        "items.$.quantity": quantity,
        updatedAt: new Date(),
      },
    },
  );

  if (result.matchedCount === 0) {
    throw createHttpError(404, "Cart item not found");
  }

  const cart = await buildCartResponse(userId);

  response.json({
    message: "Cart updated",
    cart,
  });
}

export async function removeCartItem(request, response) {
  const database = getDatabase();
  const userId = toObjectId(request.userId, "User ID");
  const productId = toObjectId(
    request.params.productId,
    "Product ID",
  );

  await database.collection("carts").updateOne(
    { userId },
    {
      $pull: {
        items: { productId },
      },
      $set: {
        updatedAt: new Date(),
      },
    },
  );

  const cart = await buildCartResponse(userId);

  response.json({
    message: "Item removed from cart",
    cart,
  });
}

export async function clearCart(request, response) {
  const database = getDatabase();
  const userId = toObjectId(request.userId, "User ID");

  await database.collection("carts").updateOne(
    { userId },
    {
      $set: {
        items: [],
        updatedAt: new Date(),
      },
    },
  );

  const cart = await buildCartResponse(userId);

  response.json({
    message: "Cart cleared",
    cart,
  });
}