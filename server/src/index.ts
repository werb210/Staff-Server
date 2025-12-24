import express from "express";
import authRoutes from "./routes/auth.routes";
import healthRoutes from "./routes/_int";

const app = express();

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/_int", healthRoutes);

export default app;
