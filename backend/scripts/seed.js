import "dotenv/config";
import { MongoClient } from "mongodb";

import {
  createUniqueProductNumber,
} from "../src/utils/product-number.js";

const categories = [
  {
    name: "Electronics",
    slug: "electronics",
    isActive: true,
  },
  {
    name: "Gaming",
    slug: "gaming",
    isActive: true,
  },
  {
    name: "Accessories",
    slug: "accessories",
    isActive: true,
  },
];

const products = [
  {
    title: "Wireless Mouse",
    slug: "wireless-mouse",
    description:
      "Wireless mouse with an ergonomic design.",
    categorySlug: "accessories",
    images: [
      "/images/14ec529b674be5f932fd99f1a0790b05.jpeg",
    ],
    priceInPence: 1999,
    stock: 95,
    isActive: true,
    isFeatured: true,
  },
  {
    title: "Apple iPhone Charger",
    slug: "apple-iphone-charger",
    description:
      "Fast-charging adapter and cable for iPhone.",
    categorySlug: "accessories",
    images: [
      "/images/iphone-charger.jpg",
    ],
    priceInPence: 2999,
    stock: 96,
    isActive: true,
    isFeatured: false,
  },
  {
    title: "Smart TV",
    slug: "smart-tv",
    description:
      "4K smart television with popular streaming applications.",
    categorySlug: "electronics",
    images: [
      "/images/94e5583db1bece04f59ea1ffe68db926.webp",
    ],
    priceInPence: 59999,
    stock: 97,
    isActive: true,
    isFeatured: true,
  },
  {
    title: "iPhone 14 Pro 128GB",
    slug: "iphone-14-pro-128gb",
    description:
      "Apple iPhone 14 Pro smartphone with 128GB of storage.",
    categorySlug: "electronics",
    images: [
      "/images/a034f1d78f62dfbbd6c5b50f19ecab4e.webp",
    ],
    priceInPence: 99999,
    stock: 96,
    isActive: true,
    isFeatured: true,
  },
  {
    title: "Apple Watch",
    slug: "apple-watch",
    description:
      "Apple smartwatch with fitness tracking and notifications.",
    categorySlug: "electronics",
    images: [
      "/images/apple-watch.jpg",
    ],
    priceInPence: 64999,
    stock: 88,
    isActive: true,
    isFeatured: false,
  },
  {
    title: "EA Sports FC 25 for PS5",
    slug: "ea-sports-fc-25-ps5",
    description:
      "EA Sports FC 25 football game for PlayStation 5.",
    categorySlug: "gaming",
    images: [
      "/images/ea-sports-fc-25-ps5-986x1100w.jpg",
    ],
    priceInPence: 5999,
    stock: 92,
    isActive: true,
    isFeatured: false,
  },
  {
    title: "PlayStation 5",
    slug: "playstation-5",
    description:
      "Sony PlayStation 5 gaming console.",
    categorySlug: "gaming",
    images: [
      "/images/ps5.jpg",
    ],
    priceInPence: 44999,
    stock: 95,
    isActive: true,
    isFeatured: true,
  },
];

async function createIndexes(database) {
  await database
    .collection("categories")
    .createIndex(
      { slug: 1 },
      { unique: true },
    );

  await database
    .collection("categories")
    .createIndex(
      { name: 1 },
      { unique: true },
    );

  await database
    .collection("products")
    .createIndex(
      { slug: 1 },
      { unique: true },
    );

  await database
    .collection("products")
    .createIndex(
      { productNumber: 1 },
      {
        unique: true,
        name: "unique_product_number",
      },
    );

  await database
    .collection("products")
    .createIndex({
      categoryId: 1,
    });

  await database
    .collection("products")
    .createIndex(
      {
        title: "text",
        description: "text",
        productNumber: "text",
      },
      {
        name: "product_search",
      },
    );

  await database
    .collection("users")
    .createIndex(
      { email: 1 },
      { unique: true },
    );

  await database
    .collection("orders")
    .createIndex({
      userId: 1,
      createdAt: -1,
    });

  await database
    .collection("orders")
    .createIndex(
      { stripeSessionId: 1 },
      {
        unique: true,
        sparse: true,
      },
    );

  await database
    .collection("wishlists")
    .createIndex(
      { userId: 1 },
      { unique: true },
    );

  await database
    .collection("carts")
    .createIndex(
      { userId: 1 },
      { unique: true },
    );
}

async function prepareProductSearchIndex(
  database,
) {
  const productCollection =
    database.collection("products");

  const indexes = await productCollection
    .listIndexes()
    .toArray();

  const searchIndex = indexes.find(
    (index) => index.name === "product_search",
  );

  const includesProductNumber =
    searchIndex?.key?.productNumber === "text";

  if (
    searchIndex &&
    !includesProductNumber
  ) {
    await productCollection.dropIndex(
      "product_search",
    );
  }
}

async function seedDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is missing from .env",
    );
  }

  const client = new MongoClient(uri);
  const shouldReset =
    process.argv.includes("--reset");

  try {
    await client.connect();

    const database = client.db();

    if (shouldReset) {
      console.log(
        `Dropping database: ${database.databaseName}`,
      );

      await database.dropDatabase();
    }

    const categoryCollection =
      database.collection("categories");

    const productCollection =
      database.collection("products");

    const now = new Date();

    for (const category of categories) {
      await categoryCollection.updateOne(
        {
          slug: category.slug,
        },
        {
          $set: {
            ...category,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        {
          upsert: true,
        },
      );
    }

    const savedCategories =
      await categoryCollection
        .find({
          slug: {
            $in: categories.map(
              (category) => category.slug,
            ),
          },
        })
        .toArray();

    const categoryIds = Object.fromEntries(
      savedCategories.map((category) => [
        category.slug,
        category._id,
      ]),
    );

    for (
      const {
        categorySlug,
        ...product
      } of products
    ) {
      const categoryId =
        categoryIds[categorySlug];

      if (!categoryId) {
        throw new Error(
          `Category not found: ${categorySlug}`,
        );
      }

      const existingProduct =
        await productCollection.findOne(
          {
            slug: product.slug,
          },
          {
            projection: {
              productNumber: 1,
            },
          },
        );

      const productNumber =
        existingProduct?.productNumber ??
        await createUniqueProductNumber(
          productCollection,
        );

      await productCollection.updateOne(
        {
          slug: product.slug,
        },
        {
          $set: {
            ...product,
            productNumber,
            categoryId,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        {
          upsert: true,
        },
      );
    }

    const productsWithoutNumbers =
      await productCollection
        .find({
          $or: [
            {
              productNumber: {
                $exists: false,
              },
            },
            {
              productNumber: null,
            },
            {
              productNumber: "",
            },
          ],
        })
        .toArray();

    for (
      const product of productsWithoutNumbers
    ) {
      const productNumber =
        await createUniqueProductNumber(
          productCollection,
        );

      await productCollection.updateOne(
        {
          _id: product._id,
        },
        {
          $set: {
            productNumber,
            updatedAt: now,
          },
        },
      );
    }

    await prepareProductSearchIndex(database);
    await createIndexes(database);

    const categoryCount =
      await categoryCollection.countDocuments();

    const productCount =
      await productCollection.countDocuments();

    console.log("Database seeded successfully");
    console.log(
      `Categories: ${categoryCount}`,
    );
    console.log(
      `Products: ${productCount}`,
    );
    console.log(
      "Product numbers generated successfully",
    );
    console.log(
      "Database indexes created successfully",
    );
  } finally {
    await client.close();
  }
}

seedDatabase().catch((error) => {
  console.error(
    "Seeding failed:",
    error.message,
  );

  process.exit(1);
});