// server/src/index.ts
import "dotenv/config";
import { app } from "./app.js";
import prisma from "./db/index.js";

const SHOULD_REQUIRE_DATABASE = process.env.REQUIRE_DATABASE === "true";
const SHOULD_SKIP_DATABASE = process.env.SKIP_DATABASE === "true";

const PORT = process.env.PORT || 5000;

async function start() {
  app.locals.dbReady = false;
  try {
    if (SHOULD_SKIP_DATABASE) {
      console.warn("Skipping database connection because SKIP_DATABASE=true");
    } else {
      console.log("Connecting to database…");
      await prisma.$connect();
      console.log("Connected.");
      app.locals.dbReady = true;
    }
  } catch (err) {
    if (SHOULD_REQUIRE_DATABASE) {
      console.error("Failed to start server:", err);
      process.exit(1);
    }

    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn(
      `Database connection failed but continuing to boot (set REQUIRE_DATABASE=true to fail). Details: ${errorMessage}`,
    );
    app.locals.dbReady = false;
  }

  app.listen(PORT, () => {
    console.log(`🚀 Staff API running on port ${PORT}`);
  });
}

start();
