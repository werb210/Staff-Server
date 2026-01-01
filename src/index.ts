import express, { Request, Response } from "express";
import cors from "cors";

/**
 * App bootstrap
 */
const app = express();

app.use(cors());
app.use(express.json());

/**
 * Root
 */
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

/**
 * Health
 */
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).send("ok");
});

app.get("/api/_int/health", (_req: Request, res: Response) => {
  res.status(200).send("ok");
});

/**
 * Auth routes
 * REQUIRED — build must fail if missing
 */
import authRouter from "./routes/auth";

app.use("/api/auth", authRouter);

/**
 * Debug routes (safe in prod)
 */
app.get("/__debug/routes", (_req: Request, res: Response) => {
  const routes: Array<{ path: string; methods: string[] }> = [];

  app._router.stack.forEach((layer: any) => {
    if (layer.route) {
      routes.push({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      });
    }
  });

  res.json({
    count: routes.length,
    routes,
  });
});

/**
 * Start server
 */
const port = Number(process.env.PORT) || 8080;

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on ${port}`);
});
