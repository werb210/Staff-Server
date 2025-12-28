import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/api/_int/live", (_req, res) => {
  res.status(200).json({ live: true });
});

const port = Number(process.env.PORT || 3000);

app.listen(port, "0.0.0.0", () => {
  console.log(`Staff-Server listening on port ${port}`);
});
