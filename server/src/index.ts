import "dotenv/config";
import express from "express";
import cors from "cors";

import authRouter from "./api/auth/index.js";
import usersRouter from "./api/users/index.js";
import intRouter from "./api/_int/index.js";
import crmRouter from "./api/crm/index.js";

const app = express();

app.set("trust proxy", true);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/**
 * API ROUTES
 */
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/_int", intRouter);
app.use("/api/crm", crmRouter);

/**
 * Root (optional)
 */
app.get("/", (_req, res) => {
  res.status(200).json({ ok: true, service: "staff-server" });
});

/**
 * 404 -> JSON (so curl isn’t spitting HTML)
 */
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, () => {
  console.log(`Staff-Server running on port ${PORT}`);
});
