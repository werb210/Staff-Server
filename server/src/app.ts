import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import router from "./routes/index.js";

import { errorHandler } from "./middlewares/errorHandler.js";

export const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api", router);

app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Not found" });
});

app.use(errorHandler);
