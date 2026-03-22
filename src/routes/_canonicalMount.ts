import { type Router } from "express";

const mounted = new Set<string>();

export function mount(router: Router, path: string, handler: Router): void {
  if (mounted.has(path)) {
    console.error(`ROUTE COLLISION: ${path} already mounted`);
    process.exit(1);
  }

  mounted.add(path);
  router.use(path, handler);
}
