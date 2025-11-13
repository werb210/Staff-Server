import "dotenv/config";
import express from "express";
import cors from "cors";
import { router as documentsRouter } from "./routes/documents.routes.js";

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get("/health", (_, res) => res.json({ ok: true }));

// Documents
app.use("/documents", documentsRouter);

export default app;
