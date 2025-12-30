import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import http from "http";
import { assertDb } from "./db";
import { registerRoutes } from "./routes";

const app = express();

// Azure/App Service friendly settings
app.set("trust proxy", 1);
app.disable("x-powered-by");

// MUST exist and MUST be fast (Azure Health Probe hits this)
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).type("text/plain").send("ok");
});

// Optional root sanity check
app.get("/", (_req: Request, res: Response) => {
  res.status(200).type("text/plain").send("ok");
});

// Body parsing AFTER health endpoints
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Attach DB only for API routes (health must not depend on DB)
app.use("/api", async (req: Request, res: Response, next: NextFunction) => {
  try {
    (req as any).db = await assertDb();
    next();
  } catch (err) {
    // Keep service alive; API reports DB problem explicitly.
    res.status(503).json({ error: "db_unavailable" });
  }
});

// Register all app routes
registerRoutes(app);

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "not_found" });
});

// Error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "unknown_error";
  res.status(500).json({ error: "server_error", message });
});

const port = Number(process.env.PORT || 8080);
const server = http.createServer(app);

// Do not block startup on DB; /api will return 503 until DB is reachable.
server.listen(port, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Staff API running on port ${port}`);
});
