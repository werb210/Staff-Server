import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { registerInternalRoutes } from "./routes/_int.routes.js";
import { registerCrmRoutes } from "./routes/crm.routes.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

registerInternalRoutes(app);
registerCrmRoutes(app);

app.use((req, res) => {
  res.status(404).json({ error: "route not found", path: req.path });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Staff Server listening on ${port}`);
});
