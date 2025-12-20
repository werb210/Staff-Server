import cors, { CorsOptions } from "cors";
import { Express } from "express";

export const corsOptions: CorsOptions = {
  origin: "https://staff.boreal.financial",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
  credentials: false,
  optionsSuccessStatus: 200,
};

export function applyCors(app: Express) {
  const corsHandler = cors(corsOptions);
  app.use(corsHandler);
  app.options("*", corsHandler);
}
