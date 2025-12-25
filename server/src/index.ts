import express from "express";
import apiRouter from "./api/index.js";
import internalRouter from "./routes/_int.js";

const app = express();

app.use(express.json());

app.use("/_int", internalRouter);
app.use("/api", apiRouter);

const PORT = Number(process.env.PORT ?? 8080);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
