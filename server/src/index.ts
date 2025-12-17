import express from "express";
import helmet from "helmet";
import intRoutes from "./routes/_int.routes.js";

const app = express();

app.use(helmet());
app.use(express.json());

app.use("/api/_int", intRoutes);

app.get("/", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const port = process.env.PORT ? Number(process.env.PORT) : 8080;

app.listen(port, () => {
  console.log(`Staff Server running on port ${port}`);
});
