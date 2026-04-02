import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown;

type LegacyApiResponse = {
  success: boolean;
  data?: unknown;
  error?: { message?: string; code?: string } | string;
};

function isLegacyApiResponse(value: unknown): value is LegacyApiResponse {
  return Boolean(value && typeof value === "object" && "success" in value);
}

function isStatusEnvelope(value: unknown): value is { status: "ok" | "error"; data?: unknown; error?: unknown } {
  return Boolean(value && typeof value === "object" && "status" in value);
}

export function wrap(handler: AsyncHandler): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const rid = (req as any).rid;

    try {
      const result = await handler(req, res, next);

      if (res.headersSent) return;

      if (result === undefined) {
        throw new Error("EMPTY_RESPONSE");
      }

      if (isStatusEnvelope(result)) {
        if (result.status === "ok") {
          res.status(200).json({ status: "ok", rid, ...(result.data !== undefined ? { data: result.data } : {}) });
          return;
        }

        const statusError =
          typeof result.error === "string"
            ? result.error
            : result.error && typeof result.error === "object" && "message" in result.error
              ? String((result.error as { message?: unknown }).message ?? "Internal Server Error")
              : "Internal Server Error";
        res.status(400).json({ status: "error", rid, error: statusError });
        return;
      }

      if (isLegacyApiResponse(result)) {
        if (result.success) {
          res.status(200).json({ status: "ok", rid, ...(result.data !== undefined ? { data: result.data } : {}) });
          return;
        }

        const legacyError = typeof result.error === "string" ? result.error : result.error?.message || "Internal Server Error";
        res.status(400).json({ status: "error", rid, error: legacyError });
        return;
      }

      res.status(200).json({
        status: "ok",
        rid,
        ...(result !== undefined ? { data: result } : {}),
      });
    } catch (err: any) {
      const statusCode = err?.status || err?.statusCode || 500;

      console.error("[ERROR]", { rid, err });
      res.status(statusCode).json({
        status: "error",
        rid,
        error: err?.message || "Internal Server Error",
      });
    }
  };
}
