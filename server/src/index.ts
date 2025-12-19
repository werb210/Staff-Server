import express from "express";
import cors, { CorsOptions } from "cors";
import { registerRoutes } from "./routes";

const app = express();

const corsOptions: CorsOptions = {
  origin: ["https://staff.boreal.financial"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// CORS + preflight
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());

/**
 * IMPORTANT:
 * registerRoutes(app) MUST define routes like:
 *   GET /api/health
 *   GET /api/applications
 * Do NOT prefix /api anywhere else.
 */
registerRoutes(app);

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`Staff Server running on port ${port}`);
});
