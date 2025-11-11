import { Router } from "express";
import { UserSchema } from "../schemas/user.schema.js";
import { logError, logInfo } from "../utils/logger.js";

const router = Router();

// Echo endpoint that validates the provided user payload.
router.post("/", (req, res) => {
  try {
    const user = UserSchema.parse(req.body);
    logInfo("Received user payload", { id: user.id, email: user.email });
    res.status(201).json({ message: "OK", data: user });
  } catch (error) {
    logError("Invalid user payload", error);
    res.status(400).json({ message: "Invalid user payload" });
  }
});

export default router;
