import { Router } from "express";
import { lenderService } from "../services/lenderService.js";
import { logInfo } from "../utils/logger.js";

/**
 * Router exposing lender endpoints.
 */
const lendersRouter = Router();

/**
 * GET /api/lenders
 * Returns a stubbed list of lenders for smoke testing.
 */
lendersRouter.get("/", (_req, res) => {
  logInfo("GET /api/lenders invoked");
  const lenders = lenderService.listLenders();
  res.json({ message: "Lenders retrieved", lenders });
});

export default lendersRouter;
