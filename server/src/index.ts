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

// CORS + preflight (must match exact options)
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());

// IMPORTANT:
// - registerRoutes(app) MUST define routes like "/api/..."
registerRoutes(app);

const port = Number(process.env.PORT) || 8080;

app.listen(port, () => {
  console.log(`Staff Server running on port ${port}`);
});

export default app;
