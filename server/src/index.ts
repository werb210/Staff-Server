import express from "express";
import intRoutes from "./routes/_int";

const app = express();

app.use(express.json());

// INTERNAL ROUTES (MUST BE BEFORE LISTEN)
app.use("/_int", intRoutes);

const port = Number(process.env.PORT) || 8080;

app.listen(port, () => {
  console.log(`Staff-Server running on port ${port}`);
});
