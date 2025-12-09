import { Router } from "express";
import { pgPool } from "../db/client";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.get("/db", async (_req, res) => {
  try {
    const result = await pgPool.query("select 1 as ok");
    res.json({ ok: true, result: result.rows[0].ok });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/routes", (req, res) => {
  const routes: string[] = [];
  const stack: any[] = (req.app as any)._router?.stack ?? [];
  for (const layer of stack) {
    if (layer.route?.path) {
      routes.push(`${Object.keys(layer.route.methods).join(",").toUpperCase()} ${layer.route.path}`);
    }
    if (layer.name === "router" && layer.handle?.stack) {
      for (const nested of layer.handle.stack) {
        if (nested.route?.path) {
          routes.push(`${Object.keys(nested.route.methods).join(",").toUpperCase()} ${nested.route.path}`);
        }
      }
    }
  }
  res.json({ routes });
});

export default router;
