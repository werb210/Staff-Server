import express from "express";
import cors from "cors";
import http from "http";

import { intRouter } from "./routes/_int.js";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// INTERNAL ROUTES — MUST BE FIRST
app.use("/_int", intRouter);

// root sanity check
app.get("/", (_req, res) => {
  res.status(200).send("Staff-Server alive");
});

const PORT = Number(process.env.PORT) || 8080;

http.createServer(app).listen(PORT, "0.0.0.0", () => {
  console.log(`Staff-Server running on port ${PORT}`);
});
