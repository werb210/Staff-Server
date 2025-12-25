import express from "express";
import apiRouter from "./api/index.js";

const logFatalError = (label: string, error: unknown): void => {
  if (error instanceof Error) {
    console.error(`${label}:`, error.stack ?? error.message);
  } else {
    console.error(`${label}:`, error);
  }
};

process.on("uncaughtException", (error) => {
  logFatalError("Uncaught exception", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logFatalError("Unhandled rejection", reason);
  process.exit(1);
});

type ExpressLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
  };
  name?: string;
  handle?: {
    stack?: ExpressLayer[];
  };
  regexp?: RegExp & { fast_slash?: boolean };
};

const getMountPath = (regexp: RegExp & { fast_slash?: boolean }): string => {
  if (regexp.fast_slash) {
    return "";
  }

  return regexp
    .toString()
    .replace("/^", "")
    .replace("\\/?(?=\\/|$)/i", "")
    .replace("/i", "")
    .replace("/$", "")
    .replace("?(?=\\/|$)", "")
    .replace(/\\\//g, "/");
};

const getRegisteredRoutes = (app: express.Express): string[] => {
  const routes: string[] = [];
  const router = (app as unknown as { _router?: { stack?: ExpressLayer[] } })
    ._router;
  const stack = (router?.stack ?? []) as ExpressLayer[];

  const walk = (layers: ExpressLayer[], prefix = ""): void => {
    for (const layer of layers) {
      if (layer.route) {
        const path = `${prefix}${layer.route.path}`;
        const methods = Object.keys(layer.route.methods).map((method) =>
          method.toUpperCase()
        );
        for (const method of methods) {
          routes.push(`${method} ${path}`);
        }
        continue;
      }

      if (layer.name === "router" && layer.handle?.stack && layer.regexp) {
        const mountPath = getMountPath(layer.regexp);
        walk(layer.handle.stack, `${prefix}${mountPath}`);
      }
    }
  };

  walk(stack);
  return routes.sort();
};

const app = express();

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

try {
  const PORT = Number(process.env.PORT ?? 8080);
  console.log("Startup diagnostics:", {
    NODE_ENV: process.env.NODE_ENV ?? "unknown",
    PORT,
    WEBSITES_PORT: process.env.WEBSITES_PORT ?? "unknown",
    env: {
      JWT_SECRET: Boolean(process.env.JWT_SECRET),
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      PGHOST: Boolean(process.env.PGHOST),
      PGPORT: Boolean(process.env.PGPORT),
      PGUSER: Boolean(process.env.PGUSER),
      PGPASSWORD: Boolean(process.env.PGPASSWORD),
      PGDATABASE: Boolean(process.env.PGDATABASE),
      TWILIO_ACCOUNT_SID: Boolean(process.env.TWILIO_ACCOUNT_SID),
      TWILIO_AUTH_TOKEN: Boolean(process.env.TWILIO_AUTH_TOKEN),
      TWILIO_VERIFY_SERVICE_SID: Boolean(process.env.TWILIO_VERIFY_SERVICE_SID),
    },
  });
  console.log("Startup: beginning route mount");

  app.use(express.json());
  const internalRouter = express.Router();
  internalRouter.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  internalRouter.get("/routes", (_req, res) => {
    res.status(200).json(getRegisteredRoutes(app));
  });
  app.use("/api/_int", internalRouter);
  app.use("/api", apiRouter);

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log("Registered routes:\n" + getRegisteredRoutes(app).join("\n"));
  });
} catch (error) {
  console.error("Startup error:", error);
}
