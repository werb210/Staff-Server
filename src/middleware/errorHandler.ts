import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as any).request_id;

  console.error({
    request_id: requestId,
    error: err?.message || 'Unknown error',
    stack: err?.stack,
  });

  const status = err?.status || 500;

  res.status(status).json({
    success: false,
    code: err?.code || 'internal_error',
    message: err?.message || 'Internal server error',
    request_id: requestId,
  });
}
