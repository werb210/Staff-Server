import express from "express";
import authRoutes from "./routes/auth";
import internalRoutes from "./routes/internal";

const app = express();
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/_int", internalRoutes);

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
