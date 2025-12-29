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
 * Frontend expects /api/auth/*
 */
app.use("/api/auth", authRoutes);

/* -------------------- START SERVER (AZURE SAFE) -------------------- */
const PORT = Number(process.env.PORT);

if (!PORT) {
  console.error("PORT is not defined. Azure will not route traffic.");
  process.exit(1);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Staff-Server listening on port ${PORT}`);
});
