const { MongoClient, ObjectId } = require("mongodb");

let client;
let db;

async function connectToDb(uri) {
  if (db) return db;
  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  return db;
}

function getDb(req) {
  return req.app.locals.db;
}

module.exports = { connectToDb, getDb, ObjectId };
