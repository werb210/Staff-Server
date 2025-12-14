import express from "express";
import cors from "cors";

import authMiddleware from "./middleware/auth";
import internalRoutes from "./api/internal";
import apiRoutes from "./api";

const app = express();

/* middleware */
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* PUBLIC ROUTES — MUST BE ABOVE AUTH */
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.use("/api/_int", internalRoutes);

/* AUTH — PROTECT EVERYTHING ELSE */
app.use(authMiddleware);

/* PROTECTED API */
app.use("/api", apiRoutes);

/* fallback */
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
