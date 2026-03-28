import "./env";
import { createServer } from "./server/createServer";
import { assertRequiredEnv, assertSingleServerStart } from "./server/runtimeGuards";

assertRequiredEnv(process.env);
assertSingleServerStart();

process.on("unhandledRejection", (err) => {
  throw err;
});

process.on("uncaughtException", (err) => {
  throw err;
});

const app = createServer();

const PORT = Number(process.env.PORT);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, "0.0.0.0");
}

export { app };
