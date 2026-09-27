import "dotenv/config";

import app from "./app.js";
import {
  closeDatabase,
  connectToDatabase,
} from "./config/database.js";

const port = Number(process.env.PORT) || 5000;

function validateEnvironment() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing");
  }

  if (!process.env.FRONTEND_URL) {
    throw new Error("FRONTEND_URL is missing");
  }

  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET.length < 32
  ) {
    throw new Error(
      "JWT_SECRET must contain at least 32 characters",
    );
  }
}

async function startServer() {
  validateEnvironment();

  await connectToDatabase(process.env.MONGODB_URI);

  const server = app.listen(port, () => {
    console.log(
      `Cartify API running at http://localhost:${port}`,
    );
  });

  let shuttingDown = false;

  async function shutDown(signal) {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    console.log(`${signal} received. Shutting down…`);

    server.close(async (error) => {
      if (error) {
        console.error(
          "Failed to close the HTTP server:",
          error,
        );
      }

      try {
        await closeDatabase();
      } catch (databaseError) {
        console.error(
          "Failed to close MongoDB:",
          databaseError,
        );
      }

      process.exit(error ? 1 : 0);
    });
  }

  process.on("SIGINT", () => shutDown("SIGINT"));
  process.on("SIGTERM", () => shutDown("SIGTERM"));
}

startServer().catch(async (error) => {
  console.error(
    "Failed to start Cartify:",
    error.message,
  );

  try {
    await closeDatabase();
  } catch {
    // The database may not have connected yet.
  }

  process.exit(1);
});