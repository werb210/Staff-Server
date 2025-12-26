import express from "express";

const app = express();

const port = Number(process.env.PORT || 8080);

app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});
