import express from "express";
import cors from "cors";
import morgan from "morgan";

import internalRouter from "./routes/_int";

const app = express();

/**
 * Core middleware
 */
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

/**
 * INTERNAL ROUTES
 * MUST be mounted BEFORE any catch-all
 */
app.use("/api/_int", internalRouter);

/**
 * Root sanity check
 */
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "staff-server" });
});

/**
 * Final 404 handler (LAST)
 */
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

/**
 * Server boot
 */
const port = Number(process.env.PORT) || 8080;

app.listen(port, () => {
  console.log(`Staff-Server running on port ${port}`);
});
