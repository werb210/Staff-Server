import type { NextFunction, Request, RequestHandler, Response } from "express";

type RouteHandler = (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>;

type Envelope =
  | { status: "ok"; data: unknown }
  | { status: "error"; error: { code: string; message?: string } | string };

function isEnvelope(value: unknown): value is Envelope {
  return Boolean(
    value &&
      typeof value === "object" &&
      "status" in value &&
      ((value as { status?: string }).status === "ok" || (value as { status?: string }).status === "error"),
  );
}

function getRequestId(req: Request, res: Response): string | undefined {
  return (req as Request & { rid?: string }).rid || req.requestId || res.locals.requestId;
}

function formatErrorMessage(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (value && typeof value === "object") {
    const errorObject = value as { message?: unknown; code?: unknown };

    if (typeof errorObject.message === "string" && errorObject.message.trim().length > 0) {
      return errorObject.message;
    }

    if (typeof errorObject.code === "string" && errorObject.code.trim().length > 0) {
      return errorObject.code;
    }
  }

  return "UNKNOWN";
}

function sendError(res: Response, statusCode: number, error: unknown, rid?: string): void {
  res.status(statusCode).json({
    status: "error",
    error: formatErrorMessage(error),
    rid,
  });
}

export function wrap(handler: RouteHandler): RequestHandler {
  return async (req, res, next) => {
    const rid = getRequestId(req, res);

    try {
      const result = await handler(req, res, next);

      if (res.headersSent) {
        return;
      }

      if (!result) {
        sendError(res, 500, "EMPTY_RESPONSE", rid);
        return;
      }

      if (!isEnvelope(result)) {
        sendError(res, 500, "INVALID_RESPONSE_SHAPE", rid);
        return;
      }

      if (result.status === "ok") {
        res.json(result);
        return;
      }

      sendError(res, 400, result.error, rid);
    } catch (err: any) {
      console.error("[ERROR]", { rid, err });
      sendError(res, err?.status || 500, err, rid);
    }
  };
}
