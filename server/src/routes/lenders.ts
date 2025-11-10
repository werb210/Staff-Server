import { Router } from "express";
import { parseLender } from "../schemas/lenderSchema.js";
import { logInfo } from "../utils/logger.js";
import { lenderService } from "../services/lenderService.js";

const lendersRouter = Router();

/**
 * Handles GET /api/lenders by returning available lenders from the lender service.
 */
lendersRouter.get("/", async (_req, res) => {
  logInfo("GET /api/lenders invoked");
  const lenders = await lenderService.listLenders();
  res.json({ lenders: lenders.map(parseLender) });
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
