import express from "express";
import { healthRouter } from "./routes/health";
import { internalRouter } from "./routes/internal";
import { apiRouter } from "./routes/api";
import { assertDb } from "./db";

const app = express();

app.use(express.json());

app.use(healthRouter);
app.use(internalRouter);
app.use("/api", apiRouter);

void assertDb();

export default app;
