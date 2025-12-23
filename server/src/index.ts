import express from "express";
import http from "http";

const app = express();
app.use(express.json());

// REQUIRED ROOT (Azure hits this)
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

// REQUIRED INTERNAL ROUTES
app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/_int/routes", (_req, res) => {
  const routes: string[] = [];
  app._router.stack.forEach((l: any) => {
    if (l.route?.path) {
      const m = Object.keys(l.route.methods).join(",");
      routes.push(`${m} ${l.route.path}`);
    }
  });
  res.json({ routes });
});

// KEEP API ROOT ALIVE
app.get("/api", (_req, res) => {
  res.status(200).json({ ok: true });
});

const PORT = Number(process.env.PORT) || 8080;

const server = http.createServer(app);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Staff-Server running on port ${PORT}`);
});

// HARD FAIL = Azure restart (expected)
server.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
