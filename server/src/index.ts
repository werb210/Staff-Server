import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import intRoutes from "./routes/_int.routes";

const app = express();

/* ================= middleware ================= */
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ================= routes ================= */
app.use("/api/_int", intRoutes);

/* ================= root ================= */
app.get("/", (_req, res) => {
  res.status(200).json({
    service: "staff-server",
    status: "running",
  });
});

/* ================= server ================= */
const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[BOOT] Staff server listening on ${PORT}`);
});

/* ================= hard guarantees ================= */
process.on("uncaughtException", (err) => {
  console.error("[FATAL] uncaughtException", err);
});

process.on("unhandledRejection", (err) => {
  console.error("[FATAL] unhandledRejection", err);
});
