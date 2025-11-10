import { Router } from "express";
import { parseLender } from "../schemas/lenderSchema.js";
import { logInfo } from "../utils/logger.js";

const lendersRouter = Router();

/**
 * Handles GET /api/lenders by returning a placeholder collection response.
 */
lendersRouter.get("/", (_req, res) => {
  logInfo("GET /api/lenders invoked");
  res.json({ message: "List lenders not implemented" });
});

/**
 * Handles POST /api/lenders by validating and echoing a lender payload.
 */
lendersRouter.post("/", (req, res) => {
  logInfo("POST /api/lenders invoked");
  try {
    const lender = parseLender(req.body);
    res.status(201).json({ message: "Lender created", lender });
  } catch (error) {
    res.status(400).json({ message: "Invalid lender payload", error: (error as Error).message });
  }
});

export default lendersRouter;
