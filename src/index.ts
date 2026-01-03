import express from "express";
import internalRoutes from "./routes/internal";
import authRoutes from "./routes/auth";

const app = express();
app.use(express.json());

app.use("/api/_int", internalRoutes);
app.use("/api/auth", authRoutes);

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
