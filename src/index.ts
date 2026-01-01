import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT_EXCEPTION", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED_REJECTION", reason);
});

const app = express();

app.use(cors());
app.use(express.json());

/**
 * Root
 */
app.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "staff-server",
  });
});

/**
 * Health
 */
app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

app.get("/api/_int/health", (_req, res) => {
  res.status(200).send("ok");
});

/**
 * Debug – route table
 */
app.get("/__debug/routes", (_req, res) => {
  const routes: { path: string; methods: string[] }[] = [];

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
 * Auth
 */
app.use("/api/auth", authRouter);

const port = Number(process.env.PORT) || 8080;

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
