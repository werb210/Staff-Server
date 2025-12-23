import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import intRoutes from "./api/_int/index.js";
import crmRoutes from "./routes/crm.routes.js";

dotenv.config();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/api/_int", intRoutes);
app.use("/api/crm", crmRoutes);

app.get("/", (_req, res) => {
  res.json({ status: "staff-server running" });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`🚀 Staff Server running on port ${port}`);
});
