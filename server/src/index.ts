import express from "express";
import api from "./api/index.js";
import intRoutes from "./routes/_int.js";

const app = express();

app.use(express.json());

app.use("/api", api);
app.use("/api/_int", intRoutes);

const port = process.env.PORT ? Number(process.env.PORT) : 5000;

app.listen(port, () => {
  console.log(`Staff server running on port ${port}`);
});
