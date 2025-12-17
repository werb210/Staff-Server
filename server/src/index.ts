import express from "express";
import cors from "cors";
import helmet from "helmet";

import intRoutes from "./routes/_int.routes";

const app = express();

/* middleware */
app.use(helmet());
app.use(cors());
app.use(express.json());

/* routes */
app.use("/api/_int", intRoutes);

/* root */
app.get("/", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

/* server */
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

app.listen(PORT, () => {
  console.log(`Staff Server running on port ${PORT}`);
});
