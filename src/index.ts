import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import authRoutes from "./auth/auth.routes";
import internalRoutes from "./routes/_int.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get("/", (_req, res) => res.status(200).send("ok"));
app.use("/api/_int", internalRoutes);
app.use("/api/auth", authRoutes);

const port = Number(process.env.PORT) || 5050;
app.listen(port, "0.0.0.0", () => {
  console.log(`Staff-Server running on port ${port}`);
});
