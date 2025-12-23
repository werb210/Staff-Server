import express from "express";
import cors from "cors";

const app = express();
const PORT = Number(process.env.PORT) || 8080;

app.use(cors());
app.use(express.json());

/* ROOT HEALTH CHECK — REQUIRED BY AZURE */
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/* INTERNAL HEALTH */
app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/* ROUTE REGISTRATION — NO CONDITIONS */
import apiRouter from "./api";
app.use("/api", apiRouter);

/* START SERVER — MUST BE LAST */
app.listen(PORT, () => {
  console.log(`Staff-Server running on port ${PORT}`);
});
