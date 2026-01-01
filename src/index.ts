import express from "express";
import cors from "cors";

import authRouter from "./routes/auth";
import debugRouter from "./routes/debug.routes";

const app = express();

/* ---------- Middleware ---------- */
app.use(cors());
app.use(express.json());

/* ---------- Root ---------- */
app.get("/", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/* ---------- Internal Health ---------- */
app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

app.get("/api/_int/health", (_req, res) => {
  res.status(200).send("ok");
});

/* ---------- Debug ---------- */
app.use("/__debug", debugRouter);

/* ---------- Auth ---------- */
app.use("/api/auth", authRouter);

/* ---------- Startup ---------- */
const port = Number(process.env.PORT) || 8080;

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
