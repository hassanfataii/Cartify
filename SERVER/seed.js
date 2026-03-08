const path = require("path");
const fs = require("fs");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config({ path: path.join(__dirname, ".env") });

let EJSON = null;
try { ({ EJSON } = require("bson")); } catch {}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "cartify";
const DATA_DIR = path.resolve(__dirname, "..", "db");

const isBsonObjectId = (v) => v && typeof v === "object" && v._bsontype === "ObjectId";

function toObjIdMaybe(v) {
  return typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v) ? new ObjectId(v) : v;
}
function toDateMaybe(v, key) {
  if (typeof v === "string" && /(?:At|Date)$/.test(key)) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return v;
}
function fromExtendedJSON(x) {
  if (Array.isArray(x)) return x.map(fromExtendedJSON);
  if (x && typeof x === "object") {
    const keys = Object.keys(x);
    if (keys.length === 1 && keys[0] === "$oid" && typeof x.$oid === "string") {
      return new ObjectId(x.$oid);
    }
    if (keys.length === 1 && keys[0] === "$date") {
      const v = x.$date;
      if (typeof v === "string" || typeof v === "number") {
        const d = new Date(v);
        if (!isNaN(d)) return d;
      } else if (v && typeof v === "object" && typeof v.$numberLong === "string") {
        const d = new Date(Number(v.$numberLong));
        if (!isNaN(d)) return d;
      }
    }
    const out = {};
    for (const [k, v] of Object.entries(x)) out[k] = fromExtendedJSON(v);
    return out;
  }
  return x;
}
function revive(x) {
  if (Array.isArray(x)) return x.map(revive);
  if (x && typeof x === "object") {
    if (isBsonObjectId(x) || x instanceof Date) return x;
    const out = {};
    for (const [k, v] of Object.entries(x)) {
      if (v && typeof v === "object") out[k] = revive(v);
      else if (k === "_id" || /Id$/.test(k)) out[k] = toObjIdMaybe(v);
      else out[k] = toDateMaybe(v, k);
    }
    return out;
  }
  return x;
}
function inferCollectionName(fileNameNoExt) {
  if (fileNameNoExt.includes(".")) {
    const parts = fileNameNoExt.split(".");
    return parts[parts.length - 1];
  }
  const dbPrefix = DB_NAME.toLowerCase();
  const lower = fileNameNoExt.toLowerCase();
  if (lower.startsWith(dbPrefix + "_")) return fileNameNoExt.slice(dbPrefix.length + 1);
  if (lower.startsWith(dbPrefix + "-")) return fileNameNoExt.slice(dbPrefix.length + 1);
  return fileNameNoExt;
}
async function loadJsonArray(file) {
  const raw = await fs.promises.readFile(file, "utf8");
  let data;
  if (EJSON) {
    try {
      data = EJSON.parse(raw, { relaxed: false });
    } catch {
      data = JSON.parse(raw);
    }
  } else {
    const parsed = JSON.parse(raw);
    data = fromExtendedJSON(parsed);
  }
  if (!Array.isArray(data)) throw new Error(`${path.basename(file)} must be a JSON array`);
  return revive(data);
}
async function applyIndexes(db, indexesPath) {
  if (!fs.existsSync(indexesPath)) return;
  const spec = JSON.parse(await fs.promises.readFile(indexesPath, "utf8"));
  for (const [col, defs] of Object.entries(spec)) {
    if (!Array.isArray(defs)) continue;
    const coll = db.collection(col);
    for (const def of defs) {
      const key = def.key || {};
      const options = def.options || {};
      try {
        await coll.createIndex(key, options);
        console.log(`  index: ${col} ${JSON.stringify(key)}${Object.keys(options).length ? " " + JSON.stringify(options) : ""}`);
      } catch (e) {
        console.warn(`  index skipped (${col}): ${e.message}`);
      }
    }
  }
}

(async function main() {
  console.log(`Seeding ${DB_NAME} from ${DATA_DIR} (skip-existing mode)`);
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);

  try {
    if (!fs.existsSync(DATA_DIR)) throw new Error(`Data folder missing: ${DATA_DIR}`);

    const files = (await fs.promises.readdir(DATA_DIR))
      .filter(f => f.endsWith(".json") && f !== "indexes.json");

    for (const f of files) {
      const base = path.basename(f, ".json");
      const col = inferCollectionName(base);
      const filePath = path.join(DATA_DIR, f);
      const coll = db.collection(col);

      const count = await coll.estimatedDocumentCount();
      if (count > 0) {
        console.log(`- ${col}: has ${count} docs, skipped`);
        continue;
      }

      const docs = await loadJsonArray(filePath);
      if (!docs.length) {
        console.log(`- ${col}: 0 docs (skipped)`);
        continue;
      }

      const r = await coll.insertMany(docs, { ordered: false });
      console.log(`- ${col}: inserted ${r.insertedCount}`);
    }

    const idxPath = path.join(DATA_DIR, "indexes.json");
    if (fs.existsSync(idxPath)) {
      console.log("- creating indexes (idempotent)");
      await applyIndexes(db, idxPath);
    } else {
      console.log("- no indexes.json found (skipped)");
    }

    console.log(" Seed complete");
  } catch (e) {
    console.error(" Seed failed:", e.message);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
})();
