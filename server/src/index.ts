import express from "express";
import cors from "cors";

// ---- App ----
const app = express();

// ---- Middleware ----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// ---- Root ----
app.get("/", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// ---- Internal health ----
app.get("/_int/health", (_req, res) => {
  res.status(200).json({ ok: true, uptime: process.uptime() });
});

// ---- Internal routes debug ----
app.get("/_int/routes", (_req, res) => {
  const routes: string[] = [];
  app._router.stack.forEach((layer: any) => {
    if (layer.route?.path) {
      const methods = Object.keys(layer.route.methods)
        .map((m) => m.toUpperCase())
        .join(",");
      routes.push(`${methods} ${layer.route.path}`);
    }
  });
  res.status(200).json({ routes });
});

// ---- Port & Listen (bind ONCE) ----
const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Staff-Server listening on ${PORT}`);
});
