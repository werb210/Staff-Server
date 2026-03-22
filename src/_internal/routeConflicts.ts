import { Express } from "express";

type RouteKey = string;

function extractRoutes(app: Express): RouteKey[] {
  const routes: RouteKey[] = [];

  const stack = (app )?._router?.stack ?? [];

  stack.forEach((middleware: any) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods);
      methods.forEach((m: string) => {
        routes.push(`${m.toUpperCase()} ${middleware.route.path}`);
      });
    } else if (middleware.name === "router") {
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods);
          methods.forEach((m: string) => {
            routes.push(`${m.toUpperCase()} ${handler.route.path}`);
          });
        }
      });
    }
  });

  return routes;
}

export function assertNoDuplicateRoutes(app: Express) {
  const routes = extractRoutes(app);

  const seen = new Map<string, number>();

  for (const r of routes) {
    seen.set(r, (seen.get(r) || 0) + 1);
  }

  const duplicates = Array.from(seen.entries()).filter(([_, count]) => count > 1);

  if (duplicates.length > 0) {
    console.error("DUPLICATE ROUTES DETECTED:");
    duplicates.forEach(([route, count]) => {
      console.error(`${route} (${count}x)`);
    });

    process.exit(1);
  }

  console.log("NO DUPLICATE ROUTES");
}
