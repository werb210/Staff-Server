import express from "express";
import cors from "cors";

import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";

import internalRoutes from "./routes/internal";

const app = express();

app.use(cors());
app.use(express.json());

app.use(requestLogger);
app.use("/api/_int", internalRoutes);

app.use(errorHandler);

export default app;
