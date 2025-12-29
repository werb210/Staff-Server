import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./auth/auth.routes";

const app = express();

/* -------------------- CORS (FINAL, LOCKED) -------------------- */
app.use(
  cors({
    origin: "https://staff.boreal.financial",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* -------------------- MIDDLEWARE -------------------- */
app.use(express.json());
app.use(cookieParser());

/* -------------------- INTERNAL HEALTH -------------------- */
app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "boreal-staff-server",
    timestamp: new Date().toISOString(),
  });
});

/* -------------------- ROUTES -------------------- */
app.use("/api/auth", authRoutes);

/* -------------------- ERROR HANDLER -------------------- */
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

/* -------------------- START SERVER -------------------- */
const port = Number(process.env.PORT) || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`Staff-Server listening on port ${port}`);
});
