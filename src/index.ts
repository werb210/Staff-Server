import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import http from "http";
import { assertDb } from "./db";
import { registerRoutes } from "./routes";

const requiredEnv = ["DATABASE_URL", "JWT_SECRET"] as const;
for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(`missing_env_${name}`);
  }
}

void (async () => {
  try {
    await assertDb();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  }
})();

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).type("text/plain").send("ok");
});

app.get("/", (_req: Request, res: Response) => {
  res.status(200).type("text/plain").send("ok");
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

registerRoutes(app);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "not_found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "unknown_error";
  res.status(500).json({ error: "internal_error", message });
});

const port = Number(process.env.PORT || 8080);
const server = http.createServer(app);

server.listen(port, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`SERVER LISTENING on ${port}`);
});
