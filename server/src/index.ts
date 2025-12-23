import express from "express";
import cors from "cors";
import http from "http";

const app = express();

/* --------------------
   Core middleware
--------------------- */
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* --------------------
   REQUIRED HEALTH ROUTES
   (Azure depends on these)
--------------------- */

// Root health (Azure default probe)
app.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "staff-server",
  });
});

// Internal health
app.get("/_int/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
  });
});

// Internal route list
app.get("/_int/routes", (_req, res) => {
  const routes: string[] = [];

  app._router.stack.forEach((layer: any) => {
    if (layer.route?.path) {
      const methods = Object.keys(layer.route.methods)
        .map(m => m.toUpperCase())
        .join(",");
      routes.push(`${methods} ${layer.route.path}`);
    }
  });

  res.status(200).json({ routes });
});

/* --------------------
   START SERVER
--------------------- */

const PORT = Number(process.env.PORT || 8080);
const HOST = "0.0.0.0";

const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  console.log(`Staff-Server running on ${HOST}:${PORT}`);
});
