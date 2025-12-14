import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import internalRoutes from "./routes/internal";
import auth from "./middleware/auth";

const app = express();

/**
 * Global middleware
 */
app.use(cors({
  origin: "*",
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

/**
 * Internal API (protected)
 */
app.use("/api/_int", auth, internalRoutes);

/**
 * Fallback
 */
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
