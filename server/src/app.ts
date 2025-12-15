import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import apiRoutes from "./api";

const app = express();

// 1. express.json()
app.use(express.json({ limit: "5mb" }));

// 2. security middleware (CORS)
app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = new Set([
        "https://staff.boreal.financial",
        "http://localhost:5173",
        "http://localhost:3000",
      ]);
      if (!origin) return cb(null, true);
      if (allowed.has(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(cookieParser());

// 3. /api router
app.use("/api", apiRoutes);

// 4. 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// 5. error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error", err);
  res.status(500).json({ error: "Internal Server Error" });
});

export { app };
export default app;
