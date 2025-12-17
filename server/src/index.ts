import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";

const app = express();

app.use(
  cors({
    origin: ["https://staff.boreal.financial"],
    credentials: true,
  }),
);
app.use(express.json());

registerRoutes(app);

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Staff Server running on port ${port}`);
});
