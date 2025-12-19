import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";

const app = express();

app.use(
  cors({
    origin: ["https://staff.boreal.financial"],
    credentials: true,
  }),
);

app.use(express.json());

/**
 * IMPORTANT:
 * Staff-Portal calls backend using /api/* (ex: /api/applications, /api/lenders).
 * Your existing registerRoutes(app) registers routes at root (ex: /applications, /lenders),
 * causing 404s for /api/*.
 *
 * Solution:
 * Register routes BOTH at root and under /api to stay backward-compatible.
 */
registerRoutes(app);

const apiRouter = express.Router();
// registerRoutes likely expects an Express-like object with get/post/use.
// Router satisfies this at runtime; cast keeps TS happy.
registerRoutes(apiRouter as any);
app.use("/api", apiRouter);

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Staff Server running on port ${port}`);
});
