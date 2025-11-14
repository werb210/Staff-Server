import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import apiRouter from "./routes/index.js";

const app = express();
const serviceName = "staff-backend";

app.use(cors());
app.use(bodyParser.json());

app.get("/api/_int/health", (req, res) => {
  res.json({ ok: true, service: serviceName });
});

app.use("/api", apiRouter);

app.get("/", (_, res) => {
  res.send("Boreal Staff Backend (Silo mode active)");
});

export default app;
