import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ApiResponse } from "../types/api";
import { asyncHandler } from "../utils/http/asyncHandler";
import { fail, ok } from "../utils/http/respond";

type RouteHandler = (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>;

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return Boolean(value && typeof value === "object" && "success" in value);
}

function isLegacyEnvelope(value: unknown): value is { status: "ok"; data: unknown } | { status: "error"; error: unknown } {
  return Boolean(value && typeof value === "object" && "status" in value);
}

function toMessage(error: unknown): string {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return "Unexpected server error";
}

export function wrap(handler: RouteHandler): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    const result = await handler(req, res, next);

    if (res.headersSent) {
      return;
    }

    if (result === undefined) {
      throw new Error("EMPTY_RESPONSE");
    }

    if (isApiResponse(result)) {
      if (result.success) {
        ok(res, result.data);
        return;
      }

      fail(res, result.error.message, 400, result.error.code, result.error.details);
      return;
    }

    if (isLegacyEnvelope(result)) {
      if (result.status === "ok") {
        ok(res, result.data);
        return;
      }

      fail(res, toMessage(result.error), 400);
      return;
    }

    ok(res, result);
  });
}
