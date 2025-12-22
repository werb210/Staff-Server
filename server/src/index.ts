import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./api/auth/index.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

app.use("/api/auth", authRouter);

app.get("/_health", (_req: Request, res: Response, _next: NextFunction) => {
  res.status(200).json({ ok: true });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Staff-Server running on port ${port}`);
});
