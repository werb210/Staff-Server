import "dotenv/config";
import { app } from "./app.js";
import prisma, { hasDatabaseUrl } from "./db/index.js";
import { ENV } from "./utils/env.js";

const PORT = Number(process.env.PORT ?? ENV.PORT ?? 8080);

async function start() {
  app.locals.dbReady = false;

  const shouldSkipDb = ENV.SKIP_DATABASE || !hasDatabaseUrl;
  if (!shouldSkipDb) {
    try {
      await prisma.$connect();
      app.locals.dbReady = true;
      console.log("✅ Database connected");
    } catch (err) {
      console.error("⚠️  Failed to connect to database", err);

      if (ENV.REQUIRE_DATABASE) {
        console.error("Exiting because REQUIRE_DATABASE=true");
        process.exit(1);
      }
    }
  } else {
    console.warn(
      "Skipping database connection because DATABASE_URL is missing or SKIP_DATABASE=true",
    );
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server ready on port ${PORT}`);
  });
}

start();
