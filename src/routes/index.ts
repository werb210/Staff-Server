import { type Application } from "express";
import health from "./health";
import system from "./system";
import auth from "../modules/auth/auth.routes";
import users from "../modules/users/users.routes";

export function registerRoutes(app: Application) {
  app.use("/api/health", health);
  app.use(auth);
  app.use("/api/users", users);
  app.use("/api/system", system);
}
