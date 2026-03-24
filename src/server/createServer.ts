import cookieParser from "cookie-parser";
import express, { type NextFunction, type Request, type RequestHandler, type Response } from "express";

import applicationsRoutes from "../routes/applications.routes";
import authRoutes from "../routes/auth.routes";
import documentsRoutes from "../routes/documents.routes";
import telephonyRoutes from "../routes/telephony.routes";

const leadsRoutes = express.Router();
leadsRoutes.get("/", (_req, res) => {
  res.status(200).json([]);
});

const lendersRoutes = express.Router();
lendersRoutes.post("/send", (_req, res) => {
  res.status(200).json({ status: "sent" });
});

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

const requireAuth: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const authedReq = req as AuthenticatedRequest;
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.token as string | undefined;

  let token: string | null = null;

  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1] ?? null;
  } else if (cookieToken) {
    token = cookieToken;
  }

  if (!token) {
    res.status(401).json({
      ok: false,
      error: "unauthorized",
    });
    return;
  }

  authedReq.user = { id: "dev-user" };
  next();
};

export function createServer() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  // PUBLIC ROUTES (NO AUTH)
  app.use("/api/auth", authRoutes);

  // PROTECTED ROUTES
  app.use("/api/applications", requireAuth, applicationsRoutes);
  app.use("/api/leads", requireAuth, leadsRoutes);
  app.use("/api/lenders", requireAuth, lendersRoutes);
  app.use("/api/telephony", requireAuth, telephonyRoutes);
  app.use("/api/documents", requireAuth, documentsRoutes);

  app.get("/health", (_req: Request, res: Response) => {
    res.send("ok");
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      ok: false,
      error: "not_found",
    });
  });

  return app;
}
