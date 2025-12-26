import express from "express";

const app = express();

const PORT = Number(process.env.PORT) || 8080;
const HOST = "0.0.0.0";

app.get("/", (_req, res) => {
  res.status(200).send("Staff Server OK");
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

console.log("[BOOT] Starting Staff Server...");
console.log(`[BOOT] Binding to ${HOST}:${PORT}`);

app.listen(PORT, HOST, () => {
  console.log(`[READY] Staff Server listening on ${HOST}:${PORT}`);
});
