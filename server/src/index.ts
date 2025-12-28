import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import intRoutes from "./routes/_int.routes";

const app = express();

/* ----------------------------- middleware ----------------------------- */
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ------------------------------- routes -------------------------------- */
app.use("/api/_int", intRoutes);

/* -------------------------------- root -------------------------------- */
app.get("/", (_req, res) => {
  res.json({
    service: "staff-server",
    status: "running",
  });
});

/* ------------------------------- server -------------------------------- */
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Staff server listening on port ${PORT}`);
});
