import express from "express";
import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./api/users/index.js";
import intRoutes from "./routes/_int.js";

const app = express();

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/_int", intRoutes);

const port = Number(process.env.PORT) || 5000;

app.listen(port, () => {
  console.log(`Staff-Server running on port ${port}`);
});
