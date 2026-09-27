import "dotenv/config";

import { MongoClient } from "mongodb";

const email = process.argv[2]
  ?.trim()
  .toLowerCase();

if (!email) {
  console.error(
    "Usage: npm run admin:promote -- your@email.com",
  );

  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing");
  process.exit(1);
}

const client = new MongoClient(
  process.env.MONGODB_URI,
);

try {
  await client.connect();

  const database = client.db();

  const result = await database
    .collection("users")
    .updateOne(
      { email },
      {
        $set: {
          role: "admin",
          updatedAt: new Date(),
        },
      },
    );

  if (result.matchedCount === 0) {
    console.error(
      `No Cartify account found for ${email}`,
    );

    process.exitCode = 1;
  } else {
    console.log(
      `${email} is now a Cartify administrator`,
    );
  }
} catch (error) {
  console.error(
    "Unable to promote administrator:",
    error.message,
  );

  process.exitCode = 1;
} finally {
  await client.close();
}