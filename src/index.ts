import express from "express";
import type { Request, Response } from "express";

const PORT = Number(process.env.PORT) || 8080;

const app = express();

/* =========================
   BASIC MIDDLEWARE
   ========================= */

app.use(express.json());

/* =========================
   LIVENESS (MUST BE FAST)
   ========================= */

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).send("ok");
});

app.get("/api/_int/health", (_req: Request, res: Response) => {
  res.status(200).send("ok");
});

/* =========================
   ROOT (MUST EXIST)
   ========================= */

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "staff-server"
  });
});

/* =========================
   ROUTE DUMP (TEMP DEBUG)
   ========================= */

app.get("/__debug/routes", (_req: Request, res: Response) => {
  const routes: { path: string; methods: string[] }[] = [];

  const stack = (app as any)._router?.stack || [];
  for (const layer of stack) {
    if (layer.route && layer.route.path) {
      const methods = Object.keys(layer.route.methods)
        .filter(m => layer.route.methods[m])
        .map(m => m.toUpperCase());
      routes.push({ path: layer.route.path, methods });
    } else if (layer.name === "router" && layer.handle?.stack) {
      for (const r of layer.handle.stack) {
        if (r.route && r.route.path) {
          const methods = Object.keys(r.route.methods)
            .filter(m => r.route.methods[m])
            .map(m => m.toUpperCase());
          routes.push({ path: r.route.path, methods });
        }
      }
    }
  }

  res.status(200).json({
    count: routes.length,
    routes
  });
});

/* =========================
   START LISTENING IMMEDIATELY
   ========================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on ${PORT}`);
});

/* =========================
   BACKGROUND INIT (NON-BLOCKING)
   ========================= */

(async () => {
  try {
    // Intentionally empty for now.
    // DB, auth, jobs, etc. must NOT block startup.
    console.log("Background init completed");
  } catch (err) {
    console.error("Background init failed", err);
  }
})();
