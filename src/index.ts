import "./env";
import { createServer } from "./server/createServer";

const requiredEnv = ["DATABASE_URL", "JWT_SECRET"];

if (process.env.NODE_ENV !== "test") {
  for (const key of requiredEnv) {
    if (!process.env[key]) {
      throw new Error(`Missing env: ${key}`);
    }
  }
}

process.on("unhandledRejection", (err) => {
  console.error(err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error(err);
  process.exit(1);
});

const app = createServer();

const PORT = Number(process.env.PORT || 8080);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, "0.0.0.0");
}

export { app };
