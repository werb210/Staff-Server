import express from "express";
import apiRouter from "./api/index.js";
import intRoutes from "./routes/_int.js";

const app = express();

app.use(express.json());

app.use("/api", apiRouter);
app.use("/api/_int", intRoutes);

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
