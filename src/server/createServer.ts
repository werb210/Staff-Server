import cookieParser from "cookie-parser";
import express, { type NextFunction, type Request, type RequestHandler, type Response } from "express";
import multer from "multer";

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

const upload = multer({ storage: multer.memoryStorage() });

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
  const applications: Record<string, Record<string, unknown>> = {};
  const documents: Array<Record<string, unknown>> = [];

  app.use(express.json());
  app.use(cookieParser());

  const authRouter = express.Router();

  authRouter.post("/otp/start", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      data: { sent: true, otp: "123456" },
    });
  });

  authRouter.post("/otp/verify", (_req: Request, res: Response) => {
    const token = "dev-token";

    res.cookie("token", token, { httpOnly: true });
    res.json({
      ok: true,
      data: { token },
    });
  });

  app.use("/api/auth", authRouter);

  app.use("/api", requireAuth);

  app.post("/api/applications", (req: Request, res: Response) => {
    const id = `app_${Date.now()}`;
    const appData = {
      id,
      ...req.body,
      createdAt: new Date().toISOString(),
    };

    applications[id] = appData;
    res.status(201).json({ ok: true, data: appData });
  });

  app.get("/api/applications/:id", (req: Request<{ id: string }>, res: Response) => {
    const appData = applications[req.params.id];

    if (!appData) {
      res.status(404).json({ ok: false, error: "not_found" });
      return;
    }

    res.json({ ok: true, data: appData });
  });

  app.post("/api/documents/upload", upload.single("file"), (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({
        ok: false,
        error: "file_required",
      });
      return;
    }

    const doc = {
      id: `doc_${Date.now()}`,
      applicationId: req.body.applicationId as string | undefined,
      category: req.body.category as string | undefined,
      filename: req.file.originalname,
      size: req.file.size,
      createdAt: new Date().toISOString(),
    };

    documents.push(doc);
    res.json({ ok: true, data: doc });
  });

  app.get("/api/applications/:id/documents", (req: Request<{ id: string }>, res: Response) => {
    const appDocs = documents.filter((document) => document.applicationId === req.params.id);
    res.json({ ok: true, data: appDocs });
  });

  app.post("/api/lenders/send", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      data: { status: "sent" },
    });
  });

  app.get("/api/offers", (req: Request, res: Response) => {
    const { applicationId } = req.query;

    res.json({
      ok: true,
      data: [
        {
          id: "offer_1",
          applicationId,
          amount: 50000,
          rate: 0.12,
        },
      ],
    });
  });

  app.get("/api/telephony/token", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      data: { token: "fake-telephony-token" },
    });
  });

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
