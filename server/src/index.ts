import express from "express";

const app = express();
const PORT = Number(process.env.PORT) || 8080;

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ status: "healthy" });
});

app.get("/api/_int/routes", (_req, res) => {
  const routes = app._router.stack
    .filter((r: any) => r.route)
    .map((r: any) => r.route.path);
  res.json({ routes });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Staff-Server running on port ${PORT}`);
});
