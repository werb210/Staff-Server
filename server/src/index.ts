import express from "express";

const app = express();

const PORT = Number(process.env.PORT || 8080);

app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/api/_int/live", (_req, res) => {
  res.status(200).send("alive");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Staff-Server listening on ${PORT}`);
});
