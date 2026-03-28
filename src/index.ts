import "./env";
import { createServer } from "./server/createServer";
import { assertRequiredEnv, assertSingleServerStart } from "./server/runtimeGuards";

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
  process.exit(1);
});

assertRequiredEnv(process.env);
assertSingleServerStart();

const app = createServer();

const PORT = Number(process.env.PORT) || 8080;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app };
