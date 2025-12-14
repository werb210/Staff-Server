import express from "express";
import cors from "cors";

import internalRoutes from "./routes/internal";
import healthRoutes from "./routes/health";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/_int", internalRoutes);
app.use("/health", healthRoutes);

export default app;
