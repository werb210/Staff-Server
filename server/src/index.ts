import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import authRouter from "./api/auth/index.js";
import usersRouter from "./api/users/index.js";
import crmRouter from "./api/crm/index.js";
import internalRouter from "./api/_int/index.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "https://staff.boreal.financial",
    "http://localhost:5173"
  ],
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

/**
 * ROUTERS
 */
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/crm", crmRouter);
app.use("/api/_int", internalRouter);

/**
 * FALLBACK (important for debugging)
 */
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    method: req.method,
    path: req.path,
  });
});

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`Staff server listening on ${PORT}`);
});
