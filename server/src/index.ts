import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 8080);
const HOST = "0.0.0.0";

/* ROOT */
app.get("/", (_req, res) => {
  res.status(200).send("Staff-Server running");
});

/* API ROOT */
app.get("/api", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/* INTERNAL HEALTH */
app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ status: "healthy" });
});

/* INTERNAL ROUTES */
app.get("/api/_int/routes", (_req, res) => {
  const routes: string[] = [];
  app._router.stack.forEach((m: any) => {
    if (m.route?.path) routes.push(m.route.path);
  });
  res.status(200).json(routes);
});

app.listen(PORT, HOST, () => {
  console.log(`Staff-Server running on ${HOST}:${PORT}`);
});
