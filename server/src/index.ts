import express from "express";
import cors from "cors";

import { requireAuth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import apiRoutes from "./routes/index.js";
import healthRoutes from "./routes/health.js";

const app = express();

app.use(
  cors({
    origin: "https://staff.boreal.financial",
    credentials: true
  })
);

app.options("*", cors());

app.use(express.json());

// Public routes
app.use("/api/auth", authRoutes);
app.use("/api/health", healthRoutes);

// Auth middleware
app.use(requireAuth);

// Protected routes
app.use("/api", apiRoutes);

const port = Number(process.env.PORT) || 8080;

app.listen(port, () => {
  console.log(`Staff Server running on port ${port}`);
});
