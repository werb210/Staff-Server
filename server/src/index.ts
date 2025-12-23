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

app.use(cors({
  origin: "https://staff.boreal.financial",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

/* ROUTE MOUNTS — THIS WAS MISSING */
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/crm", crmRouter);
app.use("/api/_int", intRouter);

/* HARD FAIL IF SERVER IS RUNNING WRONG FILE */
if (!process.env.PORT) {
  console.error("PORT not set — Azure runtime misconfigured");
}

const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, () => {
  console.log(`Staff-Server running on port ${PORT}`);
});
