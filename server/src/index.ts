import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import { loadEnvironment } from "./utils/env.js";
import { logInfo } from "./utils/logger.js";
import healthRouter from "./routes/health.js";
import applicationsRouter from "./routes/applications.js";
import documentsRouter from "./routes/documents.js";
import lendersRouter from "./routes/lenders.js";
import tasksRouter from "./routes/tasks.js";
import usersRouter from "./routes/users.js";

loadEnvironment();

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api/health", healthRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/lenders", lendersRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/users", usersRouter);

const PORT = Number(process.env.PORT ?? 5000);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    logInfo(`Server listening on port ${PORT}`);
  });
}

export default app;
