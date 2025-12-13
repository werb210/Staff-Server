import express from "express";
import cors from "cors";

const app = express();

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// NOTE:
// Internal health route REMOVED.
// It referenced a file that does not exist at runtime and caused crashes.

// root
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

// fallback
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
