import express from "express";
import apiRouter from "./api/index.js";

const app = express();

app.use(express.json());

app.use("/api", apiRouter);

app.get("/api/_int/health", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
