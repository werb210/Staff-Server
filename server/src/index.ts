import { app } from "./app";
import { config } from "./config/config";
import { verifyDatabaseConnection } from "./db";

async function start() {
  try {
    await verifyDatabaseConnection();
    console.log("Database connection verified");
  } catch (error: any) {
    console.error("Failed to connect to database:", error?.message ?? error);
    process.exit(1);
  }

  const port = Number(config.PORT || 8080);
  app.listen(port, () => {
    console.log(`Staff Server running on port ${port}`);
  });
}

start();
