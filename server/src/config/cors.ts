import cors, { CorsOptions } from "cors";
import { Express } from "express";

const allowedOrigins = ["https://staff.boreal.financial"];

export const corsOptions: CorsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Authorization"],
  credentials: false,
};

export function applyCors(app: Express) {
  const corsMiddleware = cors(corsOptions);

  app.use(corsMiddleware);
  app.options("*", corsMiddleware);
  app.use((req, res, next) => {
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    return next();
  });
}
