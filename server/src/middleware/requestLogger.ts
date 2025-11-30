import { Request, Response, NextFunction } from 'express';
import * as auditService from '../services/auditService.js';

export async function requestLogger(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id || null;
    const applicationId =
      req.body?.applicationId ||
      req.params?.applicationId ||
      null;

    // Short preview of body
    const bodyPreview =
      req.body && Object.keys(req.body).length > 0
        ? JSON.stringify(req.body).slice(0, 500)
        : null;

    await auditService.logEvent({
      eventType: "request",
      userId,
      applicationId,
      details: {
        path: req.path,
        method: req.method,
        bodyPreview,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Request logging failed:", err);
  }

  next();
}
