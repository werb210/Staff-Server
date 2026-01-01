import express from "express";
import type { Request, Response } from "express";

import authRoutes from "./routes/auth.routes";

const app = express();
app.disable("x-powered-by");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/* =========================
   CORE ROUTES
   ========================= */

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "staff-server" });
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).send("ok");
});

app.get("/api/_int/health", (_req: Request, res: Response) => {
  res.status(200).send("ok");
});

/* =========================
   API ROUTES
   ========================= */

app.use("/api/auth", authRoutes);

/* =========================
   DEBUG ROUTES (TEMP)
   ========================= */

app.get("/__debug/routes", (_req, res) => {
  const routes: any[] = [];
  app._router.stack.forEach((layer: any) => {
    if (layer.route) {
      routes.push({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      });
    }
  });
  res.json({ count: routes.length, routes });
});

/* =========================
   START SERVER
   ========================= */

const port = Number(process.env.PORT) || 8080;

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on ${port}`);
});
