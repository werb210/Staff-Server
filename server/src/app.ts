import express from "express";
import cors from "cors";

import internalRoutes from "./api/internal";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/_int", internalRoutes);

export default app;
