import express from "express";
import cors from "cors";
import helmet from "helmet";
import bodyParser from "body-parser";

// IMPORTANT: no morgan (not installed in CI)
import intRoutes from "./routes/_int";

const app = express();

app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ---- INTERNAL ROUTES ----
app.use("/api/_int", intRoutes);

// ---- ROOT ----
app.get("/", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// ---- START ----
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Staff-Server running on port ${PORT}`);
});
