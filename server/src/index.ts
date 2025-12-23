import express from "express";
import http from "http";

const app = express();

// ---- middleware
app.use(express.json());

// ---- root
app.get("/", (_req, res) => {
  res.status(200).json({ ok: true, service: "staff-server" });
});

// ---- internal health
app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ status: "healthy" });
});

app.get("/api/_int/routes", (_req, res) => {
  const routes = app._router.stack
    .filter((r: any) => r.route)
    .map((r: any) => ({
      method: Object.keys(r.route.methods)[0].toUpperCase(),
      path: r.route.path
    }));
  res.status(200).json(routes);
});

// ---- server
const PORT = Number(process.env.PORT) || 8080;

const server = http.createServer(app);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Staff-Server running on port ${PORT}`);
});
