import express from "express";

const app = express();

const PORT = Number(process.env.PORT) || 8080;

app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});
