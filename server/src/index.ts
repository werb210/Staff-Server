import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import authRouter from "./api/auth/index.js";
import usersRouter from "./api/users/index.js";
import crmRouter from "./api/crm/index.js";
import intRouter from "./api/_int/index.js";

dotenv.config();

const app = express();

/* middleware */
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? true,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

/* routers */
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/crm", crmRouter);
app.use("/api/_int", intRouter);

/* hard fail on unknown api routes */
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, () => {
  console.log(`Staff-Server running on port ${PORT}`);
});
