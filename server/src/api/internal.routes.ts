import { Router } from "express";

const router = Router();

/**
 * GET /api/internal/health
 */
router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: "staff-server",
    scope: "internal",
  });
});

/**
 * GET /api/internal/routes
 * Returns a best-effort list of registered routes.
 */
router.get("/routes", (req, res) => {
  try {
    const app: any = req.app;
    const stack = app?._router?.stack;

    if (!Array.isArray(stack)) {
      return res.status(200).json({
        status: "ok",
        routes: [],
        note: "No express router stack found",
      });
    }

    const routes: Array<{ method: string; path: string }> = [];

    for (const layer of stack) {
      // Direct routes: layer.route.path + layer.route.methods
      if (layer?.route?.path && layer?.route?.methods) {
        const methods = Object.keys(layer.route.methods)
          .filter((m) => layer.route.methods[m])
          .map((m) => m.toUpperCase());

        for (const method of methods) {
          routes.push({ method, path: layer.route.path });
        }
        continue;
      }

      // Mounted routers: layer.handle.stack contains inner layers
      const innerStack = layer?.handle?.stack;
      if (Array.isArray(innerStack)) {
        for (const inner of innerStack) {
          if (inner?.route?.path && inner?.route?.methods) {
            const methods = Object.keys(inner.route.methods)
              .filter((m) => inner.route.methods[m])
              .map((m) => m.toUpperCase());

            for (const method of methods) {
              routes.push({ method, path: inner.route.path });
            }
          }
        }
      }
    }

    // de-dupe + sort
    const unique = Array.from(
      new Map(routes.map((r) => [`${r.method} ${r.path}`, r])).values()
    ).sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method));

    res.status(200).json({ status: "ok", routes: unique });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      message: err?.message || "Failed to enumerate routes",
    });
  }
});

export default router;
