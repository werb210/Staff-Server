import cors, { CorsOptions } from "cors";
import { Express } from "express";

const allowedOrigin = "https://staff.boreal.financial";

export const corsOptions: CorsOptions = {
  origin: allowedOrigin,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  optionsSuccessStatus: 200,
};

export function applyCors(app: Express) {
  // Attach CORS headers for all requests
  app.use(cors(corsOptions));

  // Ensure OPTIONS preflight always succeeds with the correct headers
  app.options("*", cors(corsOptions));
  app.use((req, res, next) => {
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    return next();
  });
}
