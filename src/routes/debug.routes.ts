import { Router } from "express";
import type { Application } from "express";

const router = Router();

router.get("/routes", (_req, res) => {
  // This endpoint is intentionally lightweight and synchronous
  return res.status(200).json({
    ok: true,
    routes: "stack not captured"
  });
});

export function mountDebug(app: Application) {
  app.use("/_debug", router);
}

export default router;
