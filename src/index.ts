import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./auth/auth.routes";

const app = express();

/* -------------------- CORS -------------------- */
app.use(
  cors({
    origin: [
      "https://staff.boreal.financial",
      "https://client.boreal.financial",
    ],
    credentials: true,
  })
);

/* -------------------- Middleware -------------------- */
app.use(express.json());
app.use(cookieParser());

/* -------------------- Health -------------------- */
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

/* -------------------- API ROUTES -------------------- */
/**
 * THIS IS THE IMPORTANT LINE
 * Frontend expects /api/auth/*
 */
app.use("/api/auth", authRoutes);

/* -------------------- Start -------------------- */
const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, () => {
  console.log(`Staff-Server running on port ${PORT}`);
});
