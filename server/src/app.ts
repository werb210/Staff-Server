import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import internalRouter from "./routes/internal";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";

const app = express();

/* middleware */
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

/* routes */
app.use("/api/internal", internalRouter);

/* error handling */
app.use(errorHandler);

export default app;
