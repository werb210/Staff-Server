import express from "express";
import cors from "cors";
import apiRouter from "./api";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(requestLogger);
app.use("/api", apiRouter);
app.use(errorHandler);

export default app;
