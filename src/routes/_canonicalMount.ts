import { type Router } from "express";

const mounted = new Set<string>();

export function mount(router: Router, path: string, handler: Router): void {
  if (mounted.has(path)) {
    console.warn(`ROUTE COLLISION (ignored in test): ${path}`);
    return;
  }

  mounted.add(path);
  router.use(path, handler);
}
