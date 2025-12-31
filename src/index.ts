import express from "express";
import { healthRouter } from "./routes/health";
import { internalRouter } from "./routes/internal";
import { apiRouter } from "./routes/api";

const app = express();

app.use(express.json());

/**
 * ROOT — required for Azure App Service
 */
app.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "staff-server",
  });
});

/**
 * Health + internal probes
 */
app.use(healthRouter);
app.use(internalRouter);

/**
 * API
 */
app.use("/api", apiRouter);

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});

export default app;
