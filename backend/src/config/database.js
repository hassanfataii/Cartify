import { MongoClient } from "mongodb";

let client;
let database;

export async function connectToDatabase(uri) {
  if (database) {
    return database;
  }

  client = new MongoClient(uri);
  await client.connect();

  database = client.db();

  console.log(`Connected to MongoDB: ${database.databaseName}`);

  return database;
}

export function getDatabase() {
  if (!database) {
    throw new Error("Database connection has not been established");
  }

  return database;
}

export async function closeDatabase() {
  if (client) {
    await client.close();
    client = null;
    database = null;
  }
}