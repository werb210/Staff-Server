// src/routes/debug.routes.ts
import { Router } from "express";

const router = Router();

router.get("/routes", (_req, res) => {
  const stack = (res.app as any)._router?.stack ?? [];
  const routes = stack
    .filter((l: any) => l.route)
    .map((l: any) => ({
      path: l.route.path,
      methods: Object.keys(l.route.methods),
    }));

  res.json({ ok: true, routes });
});

export default router;
