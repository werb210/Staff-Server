import express from "express";
import cors from "cors";

// use require to avoid TS module resolution failures
const healthRouter = require("./routes/internal/health").default;
const dbHealthRouter = require("./routes/internal/db").default;

const app = express();

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// internal routes
app.use("/api/internal/health", healthRouter);
app.use("/api/internal/db", dbHealthRouter);

// root
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

// fallback
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
