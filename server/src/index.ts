import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";

import intRouter from "./routes/_int.js";
import apiRouter from "./api/index.js";

const app = express();

// ---- middleware ----
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- routes ----
app.use("/_int", intRouter);
app.use("/api", apiRouter);

// ---- fallback ----
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// ---- SINGLE listen (Azure-safe) ----
const PORT = Number(process.env.PORT || 8080);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Staff-Server running on port ${PORT}`);
});
