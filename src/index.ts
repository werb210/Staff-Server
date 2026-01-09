import express, { Request, Response } from "express";
import cors from "cors";

import apiRouter from "./api";
import { printRoutes } from "./debug/printRoutes";
import { requestContext } from "./middleware/requestContext";
import { notFoundHandler, errorHandler } from "./middleware/errors";

const app = express();

// --------------------
// Core middleware
// --------------------
app.use(
  cors({
    origin: true,
    credentials: false,
    allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
    exposedHeaders: ["x-request-id"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// --------------------
// REQUEST CONTEXT (FIX)
// --------------------
app.use(requestContext);

// --------------------
// Health (must be JSON)
// --------------------
app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get("/", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// --------------------
// API ROUTES
// --------------------
app.use("/api", apiRouter);

// --------------------
// FALLTHROUGHS
// --------------------
app.use(notFoundHandler);
app.use(errorHandler);

printRoutes(app);

// --------------------
// BOOT
// --------------------
const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`Staff Server running on port ${port}`);
});

export default app;
