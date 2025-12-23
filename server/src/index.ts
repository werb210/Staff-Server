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

import crmRouter from "./api/crm/index.js";
import intRouter from "./api/_int/index.js";

dotenv.config();

const app = express();

app.use(cors({ origin: true, credentials: true }));
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

/* INTERNAL + CRM */
app.use("/api/_int", intRouter);
app.use("/api/crm", crmRouter);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Staff-Server running on port ${PORT}`);
});
