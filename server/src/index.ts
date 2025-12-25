import express from "express";
import apiRouter from "./api/index.js";
import internalRoutes from "./routes/internal.js";

const app = express();

app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/*
 * Azure hard requirements:
 * - Root must return 200
 * - Health check must be fast, unconditional, and before middleware
 */
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.use("/api/_int", internalRoutes);

// middleware AFTER health
app.use(express.json());
app.use("/api", apiRouter);

// safety logging only — DO NOT exit
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

const port = Number(process.env.PORT || 8080);

app.listen(port, "0.0.0.0", () => {
  console.log(`Staff-Server running on 0.0.0.0:${port}`);
});

export default app;
