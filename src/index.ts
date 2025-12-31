import express from "express";

const app = express();
const PORT = Number(process.env.PORT) || 8080;

/**
 * HEALTH — MUST BE FIRST
 * - synchronous
 * - no DB
 * - no middleware
 * - always returns
 */
app.get("/health", (_req, res) => {
  res.status(200).type("text/plain").send("ok");
});

/**
 * OPTIONAL: internal health
 */
app.get("/api/_int/health", (_req, res) => {
  res.status(200).type("text/plain").send("ok");
});

/**
 * Middleware AFTER health
 */
app.use(express.json());

/**
 * Other routes AFTER middleware
 * app.use("/api/auth", authRouter);
 * app.use("/api", apiRouter);
 */

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
