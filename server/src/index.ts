import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import intRoutes from "./routes/_int";

const app = express();

app.use(cors());
app.use(express.json());

/**
 * INTERNAL / HEALTH ROUTES
 */
app.use("/_int", intRoutes);

/**
 * API ROUTES
 */
app.use("/api/auth", authRoutes);

/**
 * ROOT
 */
app.get("/", (_req, res) => {
  res.status(200).json({ status: "running" });
});

/**
 * SERVER START
 */
const port = Number(process.env.PORT) || 8080;

app.listen(port, () => {
  console.log(`Staff-Server running on port ${port}`);
});
