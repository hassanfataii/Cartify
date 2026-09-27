import {
  closeDatabase,
  connectToDatabase,
  getDatabase,
} from "../../src/config/database.js";

const TEST_DATABASE_NAME = "cartify_test";

const COLLECTION_NAMES = [
  "categories",
  "products",
  "users",
  "carts",
  "wishlists",
  "orders",
];

function getDatabaseName(uri) {
  try {
    const parsedUri = new URL(uri);

    return decodeURIComponent(
      parsedUri.pathname.replace(/^\/+/, ""),
    );
  } catch {
    throw new Error(
      "MONGODB_TEST_URI is not a valid MongoDB URI",
    );
  }
}

export function getTestDatabaseUri() {
  return (
    process.env.MONGODB_TEST_URI ||
    "mongodb://127.0.0.1:27017/cartify_test"
  );
}

export async function connectTestDatabase() {
  const uri = getTestDatabaseUri();
  const databaseName = getDatabaseName(uri);

  if (databaseName !== TEST_DATABASE_NAME) {
    throw new Error(
      `Tests may only use the "${TEST_DATABASE_NAME}" database. ` +
        `Received "${databaseName || "no database name"}".`,
    );
  }

  const database = await connectToDatabase(uri);

  if (database.databaseName !== TEST_DATABASE_NAME) {
    await closeDatabase();

    throw new Error(
      "Refusing to run tests against a non-test database",
    );
  }

  await Promise.all([
    database
      .collection("users")
      .createIndex(
        {
          email: 1,
        },
        {
          unique: true,
        },
      ),

    database
      .collection("categories")
      .createIndex(
        {
          slug: 1,
        },
        {
          unique: true,
        },
      ),

    database
      .collection("products")
      .createIndex(
        {
          slug: 1,
        },
        {
          unique: true,
        },
      ),

    database
      .collection("carts")
      .createIndex(
        {
          userId: 1,
        },
        {
          unique: true,
        },
      ),

    database
      .collection("wishlists")
      .createIndex(
        {
          userId: 1,
        },
        {
          unique: true,
        },
      ),
  ]);

  return database;
}

export async function resetTestDatabase() {
  const database = getDatabase();

  if (database.databaseName !== TEST_DATABASE_NAME) {
    throw new Error(
      "Refusing to clear a non-test database",
    );
  }

  await Promise.all(
    COLLECTION_NAMES.map((collectionName) =>
      database
        .collection(collectionName)
        .deleteMany({}),
    ),
  );
}

export async function closeTestDatabase() {
  const database = getDatabase();

  if (database.databaseName !== TEST_DATABASE_NAME) {
    throw new Error(
      "Refusing to close an unexpected database",
    );
  }

  await closeDatabase();
}