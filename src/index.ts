import express from "express";

const app = express();

// ---- HARD GUARANTEED FAST ROUTES (NO ASYNC, NO DB) ----

// Root (Azure probes this implicitly sometimes)
app.get("/", (_req, res) => {
  res.status(200).send("ok");
});

// Public health
app.get("/health", (_req, res) => {
  res.status(200).json({ alive: true });
});

// Internal health (what you configured in Azure)
app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

// ---- NOTHING ELSE BEFORE LISTEN ----

const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log("SERVER LISTENING on", PORT);
});
