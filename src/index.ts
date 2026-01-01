import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";

const app = express();

/* HARD GLOBAL TIMEOUT — NEVER HANG */
app.use((req, res, next) => {
  res.setTimeout(5000, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: "request_timeout" });
    }
  });
  next();
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));

/* ROOT */
app.get("/", (_req, res) => res.json({ ok: true }));

/* HEALTH */
app.get("/api/_int/health", (_req, res) => res.json({ ok: true }));
app.get("/api/_int/ready", (_req, res) => res.json({ ok: true }));

/* AUTH */
app.use("/api/auth", authRouter);

/* FAIL FAST — NO SILENT HANGS */
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("UNHANDLED_ERROR", err);
  res.status(500).json({ error: "server_error" });
});

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
