import express from "express";
import type { Request, Response } from "express";

const app = express();
app.disable("x-powered-by");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/* =========================
   CORE ROUTES (EXISTING)
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
   AUTH ROUTER (REQUIRED)
   ========================= */

let authRouter;
try {
  authRouter = require("./routes/auth").default;
} catch (err) {
  console.error("❌ AUTH ROUTER FAILED TO LOAD");
  console.error(err);
  process.exit(1);
}

app.use("/api/auth", authRouter);

/* =========================
   DEBUG ROUTE TABLE
   ========================= */

app.get("/__debug/routes", (_req: Request, res: Response) => {
  const routes: any[] = [];

  app._router.stack.forEach((layer: any) => {
    if (layer.route && layer.route.path) {
      routes.push({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods).map(m => m.toUpperCase())
      });
    }
  });

  res.json({
    count: routes.length,
    routes
  });
});

/* =========================
   START SERVER
   ========================= */

const port = Number(process.env.PORT) || 8080;

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on ${port}`);
});
