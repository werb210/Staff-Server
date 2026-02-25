import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

export function buildApp(): express.Express {
  return app;
}

export function registerApiRoutes(_app: express.Express): void {
  // Routes are mounted directly on the shared app instance.
}

export function assertCorsConfig(): void {
  // Minimal app uses default CORS middleware with no additional assertions.
}

export default app;
