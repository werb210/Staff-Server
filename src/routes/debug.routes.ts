// src/routes/debug.routes.ts
import { Router, Request, Response } from "express";

const router = Router();

/**
 * GET /_debug/routes
 * Returns a JSON list of mounted routes (best-effort).
 */
router.get("/routes", (req: Request, res: Response) => {
  try {
    const app = req.app as any;

    const out: Array<{ path: string; methods: string[] }> = [];

    // Express 4: app._router.stack
    const stack = app?._router?.stack;
    if (!Array.isArray(stack)) {
      return res.status(200).json({ ok: true, routes: [], note: "router_stack_unavailable" });
    }

    for (const layer of stack) {
      if (layer?.route?.path && layer?.route?.methods) {
        out.push({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods).filter((m) => layer.route.methods[m]),
        });
        continue;
      }

      // Nested routers: layer.handle.stack
      const nested = layer?.handle?.stack;
      if (Array.isArray(nested)) {
        for (const nl of nested) {
          if (nl?.route?.path && nl?.route?.methods) {
            out.push({
              path: nl.route.path,
              methods: Object.keys(nl.route.methods).filter((m) => nl.route.methods[m]),
            });
          }
        }
      }
    }

    return res.status(200).json({ ok: true, count: out.length, routes: out });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: "debug_routes_failed", detail: String(err?.message ?? err) });
  }
});

export default router;
