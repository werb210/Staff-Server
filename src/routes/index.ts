import { type Application } from "express";
import auth from "./auth";
import health from "./health";
import system from "./system";
import users from "../modules/users/users.routes";

export function registerRoutes(app: Application) {
  app.use("/api/health", health);
  app.use("/api/auth", auth);
  app.use("/api/users", users);
  app.use("/api/system", system);
}
