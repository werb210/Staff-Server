import { Router } from "express";
import { parseUser } from "../schemas/userSchema.js";
import { logInfo } from "../utils/logger.js";

const usersRouter = Router();

usersRouter.get("/", (_req, res) => {
  logInfo("GET /api/users invoked");
  res.json({ message: "List users not implemented" });
});

usersRouter.post("/", (req, res) => {
  logInfo("POST /api/users invoked");
  try {
    const user = parseUser(req.body);
    res.status(201).json({ message: "User created", user });
  } catch (error) {
    res.status(400).json({ message: "Invalid user payload", error: (error as Error).message });
  }
});

export default usersRouter;
