import express from "express";

const app = express();

/**
 * GUARANTEED FAST ROOT
 * No DB
 * No async
 */
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

/**
 * PUBLIC HEALTH
 */
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * INTERNAL HEALTH (Azure Health Check)
 */
app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * PORT — Azure compliant
 */
const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SERVER LISTENING on ${PORT}`);
});
