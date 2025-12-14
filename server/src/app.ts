import express from "express";
import cors from "cors";

const app = express();

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// public root
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

// public health
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "healthy" });
});

// fallback
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
