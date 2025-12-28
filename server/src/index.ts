import express from "express";

const app = express();
const PORT = process.env.PORT;

if (!PORT) {
  throw new Error("PORT is not set");
}

app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/_int/live", (_req, res) => {
  res.status(200).json({ live: true });
});

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Staff-Server listening on ${PORT}`);
});
