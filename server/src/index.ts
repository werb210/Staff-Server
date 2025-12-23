import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import { login } from "./api/auth/login.js";
import { register } from "./api/auth/register.js";
import { verifySms } from "./api/auth/verify-sms.js";
import { refreshToken } from "./api/auth/refresh-token.js";

import { listUsers } from "./api/users/users.js";
import { getUserById } from "./api/users/user-by-id.js";

import internalRouter from "./api/_int/index.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [
      "https://staff.boreal.financial",
      "http://localhost:5173"
    ],
    credentials: true
  })
);

app.use(express.json());
app.use(cookieParser());

/* AUTH */
app.post("/api/auth/login", login);
app.post("/api/auth/register", register);
app.post("/api/auth/verify-sms", verifySms);
app.post("/api/auth/refresh-token", refreshToken);

/* USERS */
app.get("/api/users", listUsers);
app.get("/api/users/:id", getUserById);

/* INTERNAL HEALTH */
app.use("/api/_int", internalRouter);

/* FALLBACK */
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    method: req.method,
    path: req.path
  });
});

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`Staff server listening on ${PORT}`);
});
