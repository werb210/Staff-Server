import { Router } from "express";

const router = Router();

router.get("/routes", (_req, res) => {
  const stack = (global as any).__express_stack__;

  res.json({
    ok: true,
    routes: stack ?? "stack not captured",
  });
});

export default router;
