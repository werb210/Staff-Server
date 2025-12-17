import express from "express";
import helmet from "helmet";
import intRoutes from "./routes/_int.routes";

const app = express();

app.use(helmet());
app.use(express.json());

app.use("/api/_int", intRoutes);

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Staff Server running on port ${PORT}`);
});
