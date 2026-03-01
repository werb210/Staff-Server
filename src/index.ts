import { buildAppWithApiRoutes } from "./app";
import { startServer } from "./server/index";

export const app = buildAppWithApiRoutes();
export { startServer };

if (process.env.NODE_ENV !== "test") {
  startServer().catch((err) => {
    console.error("server_start_failed", err);
    process.exit(1);
  });
}
