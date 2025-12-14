import express from "express";
import cors from "cors";
import internalRoutes from "./api/internal";

const app = express();

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// public
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// internal (unauthenticated, not public-facing)
app.use("/api/internal", internalRoutes);

// fallback
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
