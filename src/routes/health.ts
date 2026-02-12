import { Router } from "express";
import { successResponse } from "../middleware/response";

const router = Router();

router.get("/", (_req, res) => {
  return successResponse(res, { uptime: process.uptime() }, "server healthy");
});

export default router;
