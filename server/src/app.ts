import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

// Unified API router (already defines /auth, /applications, etc.)
import apiRouter from "./routes/index.js";

const app = express();

// --- Core Middleware ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// --- Mount all API routes at root of this app ---
// NOTE: index.ts mounts this app at "/api", so final URLs are "/api/..."
app.use("/", apiRouter);

// No root ("/") handler here – index.ts owns the true root and health routes.

export default app;
