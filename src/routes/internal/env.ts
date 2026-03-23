import { Router } from "express";
import { API_BASE, ALLOWED_ORIGINS } from "../../server/config/env/runtime";

const router = Router();

router.get("/api/_int/env", (_req: any, res: any) => {
  res.json({
    apiBaseUrl: API_BASE,
    allowedOrigins: ALLOWED_ORIGINS,
  });
});

export default router;
