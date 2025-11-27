import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import contactsRouter from "./routes/contacts";
import pipelineRouter from "./routes/pipeline";
import healthRouter from "./routes/_int";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());

app.use("/api/contacts", contactsRouter);
app.use("/api/pipeline", pipelineRouter);
app.use("/api/_int", healthRouter);

// root
app.get("/", (_, res) => res.send("OK"));

app.listen(PORT, () => {
  console.log(`🚀 Staff API running on port ${PORT}`);
});
