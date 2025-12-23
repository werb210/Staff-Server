import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// NOTE:
// - NO morgan (it is not installed)
// - ALL relative imports include .js
// - CRM is NOT mounted until it actually exists

import authRouter from "./api/auth/index.js";
import usersRouter from "./api/users/index.js";
import internalRouter from "./api/_int/index.js";

const app = express();

/* =====================
   MIDDLEWARE
===================== */
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

/* =====================
   ROUTES
===================== */
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/_int", internalRouter);

/* =====================
   ROOT (FOR AZURE)
===================== */
app.get("/", (_req, res) => {
  res.json({ status: "staff-server running" });
});

/* =====================
   START
===================== */
const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, () => {
  console.log(`Staff-Server running on port ${PORT}`);
});
