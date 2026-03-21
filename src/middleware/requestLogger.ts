import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { appInsights } from '../services/appInsights';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = randomUUID();

  (req as any).request_id = requestId;
  res.setHeader('x-request-id', requestId);

  appInsights.trackRequest({
    request_id: requestId,
    method: req.method,
    path: req.path,
  });

  res.on('finish', () => {
    appInsights.trackDependency({
      request_id: requestId,
      status: res.statusCode,
    });
  });

  next();
}
