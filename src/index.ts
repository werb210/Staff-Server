import express from "express";
import helmet from "helmet";
import cors from "cors";
import { initializeAppInsights } from "./observability/appInsights";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import {
  assertEnv,
  getCorsAllowlistConfig,
  getRequestBodyLimit,
} from "./config";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import staffRoutes from "./routes/staff";
import adminRoutes from "./routes/admin";
import applicationsRoutes from "./routes/applications";
import lenderRoutes from "./routes/lender";
import clientRoutes from "./routes/client";
import reportingRoutes from "./routes/reporting";
import reportsRoutes from "./routes/reports";
import internalRoutes from "./routes/internal";
import { logInfo } from "./observability/logger";

initializeAppInsights();

assertEnv();

const app = express();

/**
 * PUBLIC ROOT — REQUIRED FOR AZURE + BROWSER
 * MUST BE FIRST. MUST NOT HAVE MIDDLEWARE.
 */
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

/**
 * PUBLIC INTERNAL HEALTH — NEVER AUTHENTICATED
 */
app.get("/api/_int/health", (_req, res) => {
  res.status(200).send("OK");
});

/**
 * GLOBAL MIDDLEWARE — AFTER PUBLIC ROUTES
 */
app.use(requestId);
app.use(requestLogger);
app.use(helmet());
app.use(cors(getCorsAllowlistConfig()));
app.use(express.json({ limit: getRequestBodyLimit() }));

/**
 * ROUTES
 */
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/lender", lenderRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/reporting", reportingRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/_int", internalRoutes);

/**
 * ERROR HANDLERS — ABSOLUTELY LAST
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * LISTEN — AZURE SAFE
 */
const port = Number(process.env.PORT) || 8080;
app.listen(port, "0.0.0.0", () => {
  logInfo("server_listening", { port });
});
