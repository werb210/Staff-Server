import express from "express";
import healthRouter from "./routes/health";

const app = express();

app.use(express.json());

// MUST BE FIRST
app.use("/health", healthRouter);

// BASIC READY
app.get("/ready", (_req, res) => {
  res.status(200).send("ready");
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
