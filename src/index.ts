import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import http from "http";
import { assertDb } from "./db";
import { registerRoutes } from "./routes";

const app = express();

/* REQUIRED FOR AZURE */
app.set("trust proxy", 1);
app.disable("x-powered-by");

/* HEALTH — MUST BE FIRST */
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).type("text/plain").send("ok");
});

/* ROOT — MUST EXIST */
app.get("/", (_req: Request, res: Response) => {
  res.status(200).type("text/plain").send("ok");
});

/* BODY PARSING */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ROUTES */
registerRoutes(app);

/* 404 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "not_found" });
});

/* ERROR */
app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : "unknown_error";
    res.status(500).json({ error: message });
  }
);

/* BOOT */
async function start() {
  await assertDb();

  const port = Number(process.env.PORT) || 8080;
  const server = http.createServer(app);

  server.listen(port, "0.0.0.0", () => {
    console.log(`SERVER LISTENING on ${port}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
