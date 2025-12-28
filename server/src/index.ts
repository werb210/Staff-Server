import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);

app.get("/api/_int/health", (_req, res) => {
  res.status(200).send("ok");
});

app.get("/api/_int/live", (_req, res) => {
  res.status(200).send("live");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on ${PORT}`);
});
