import express from "express";

const app = express();

app.get("/", (_req, res) => res.status(200).send("ok"));
app.get("/api/_int/health", (_req, res) => res.status(200).send("ok"));
app.get("/api/_int/live", (_req, res) => res.status(200).send("live"));

const port = Number(process.env.PORT) || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log(`Staff-Server running on port ${port}`);
});
