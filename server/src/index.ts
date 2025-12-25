import express from "express";
import apiRouter from "./api/index.js";

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

const logRegisteredRoutes = (app: express.Express): void => {
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
  console.log("Registered routes:\n" + routes.sort().join("\n"));
};

const app = express();

app.use(express.json());

app.use("/api", apiRouter);

const PORT = Number(process.env.PORT ?? 8080);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  logRegisteredRoutes(app);
});
