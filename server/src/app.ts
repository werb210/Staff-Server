import express from "express";
import cors from "cors";

const app = express();

/* =========================
   Global middleware
   ========================= */
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   PUBLIC – NO AUTH – HEALTH
   ========================= */

// Root (used by Azure, load balancers, humans)
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

// Health check (used by monitors)
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/* =========================
   Everything else (auth, APIs)
   ========================= */
// auth middleware goes BELOW this point
// app.use(authMiddleware);
// app.use("/api", apiRouter);

/* =========================
   Fallback
   ========================= */
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
