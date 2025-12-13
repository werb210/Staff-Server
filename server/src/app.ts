import express from "express";
import cors from "cors";

const app = express();

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   PUBLIC, UNAUTHENTICATED
   HEALTH ROUTES
   ========================= */

app.get("/", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/* =========================
   AUTH MIDDLEWARE GOES HERE
   ========================= */

// app.use(authMiddleware);

/* =========================
   PROTECTED ROUTES
   ========================= */

// app.use("/api", apiRouter);

/* =========================
   FALLBACK
   ========================= */

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
