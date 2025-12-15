import { app } from "./app";
import { config } from "./config/config";
import { verifyDatabaseConnection } from "./db";
import { listRegisteredRoutes } from "./routes/listRoutes";

async function start() {
  try {
    if (!config.JWT_SECRET) {
      throw new Error("JWT_SECRET is required");
    }

    const dbReady = await verifyDatabaseConnection();
    if (!dbReady) {
      throw new Error("Database connection verification failed");
    }
    console.log("Database connection verified");
  } catch (error: any) {
    console.error("Failed to connect to database:", error?.message ?? error);
    process.exit(1);
  }

  const port = Number(config.PORT || 8080);
  const routes = listRegisteredRoutes(app, "");
  routes.forEach((route) => console.log(`ROUTE: ${route.method} ${route.path}`));
  app.listen(port, () => {
    console.log(`Staff Server running on port ${port}`);
  });
}

start();
