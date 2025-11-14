import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import { siloMiddleware } from "./middleware/silo.js";
import documentsRouter, {
  applicationDocumentsRouter,
} from "./routes/documents.routes.js";

const app = express();
const serviceName = "staff-backend";

app.use(cors());
app.use(bodyParser.json());

app.use(siloMiddleware);

app.use("/api/documents", documentsRouter);
app.use("/api/applications", applicationDocumentsRouter);

app.get("/api/_int/health", (req, res) => {
  res.json({ ok: true, service: serviceName, silo: req.silo ?? null });
});

app.get("/", (_, res) => {
  res.send("Boreal Staff Backend (Silo mode active)");
});

export default app;
