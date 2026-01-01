import { Router } from "express";

const router = Router();

router.get("/routes", (_req, res) => {
  const stack = (global as any).__express_stack__;

  res.json({
    ok: true,
    routes: Array.isArray(stack)
      ? stack.map((l: any) => ({
          path: l.route?.path,
          methods: l.route?.methods,
        }))
      : [],
  });
});

export default router;
