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

app.use(cors(corsOptions));

// REQUIRED for browser preflight with matching config
app.options("*", cors(corsOptions));

app.use(express.json());

// IMPORTANT:
// registerRoutes() ALREADY defines `/api/...`
// DO NOT prefix anything here
registerRoutes(app);

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`Staff Server running on port ${port}`);
});

export default app;
