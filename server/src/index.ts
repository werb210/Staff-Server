import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import intRoutes from "./routes/_int.routes";

console.log("BOOT: index.ts loaded");

const app = express();

/* ---------------- middleware ---------------- */
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ---------------- routes ---------------- */
app.use("/api/_int", intRoutes);

/* ---------------- root ---------------- */
app.get("/", (_req, res) => {
  res.json({
    service: "staff-server",
    status: "running",
  });
});

/* ---------------- server ---------------- */
const PORT = Number(process.env.PORT) || 8080;

console.log("BOOT: about to listen on port", PORT);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`BOOT: staff server listening on ${PORT}`);
});
