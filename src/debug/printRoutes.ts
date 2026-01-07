import type { Express } from "express";

export function printRoutes(app: Express) {
  const routes: { method: string; path: string }[] = [];

  app._router.stack.forEach((layer: any) => {
    if (layer.route) {
      const path = layer.route.path;
      const methods = Object.keys(layer.route.methods);
      methods.forEach((m) => routes.push({ method: m.toUpperCase(), path }));
    } else if (layer.name === "router" && layer.handle?.stack) {
      layer.handle.stack.forEach((h: any) => {
        if (h.route) {
          const path = h.route.path;
          const methods = Object.keys(h.route.methods);
          methods.forEach((m) => routes.push({ method: m.toUpperCase(), path }));
        }
      });
    }
  });

  console.log("==== REGISTERED ROUTES ====");
  routes
    .sort((a, b) => a.path.localeCompare(b.path))
    .forEach((r) => console.log(`${r.method} ${r.path}`));
  console.log("===========================");
}
