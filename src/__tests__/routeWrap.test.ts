import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { wrap } from "../lib/routeWrap";

function createMockRes(): Response & { body?: unknown; statusCode?: number } {
  const res = {
    headersSent: false,
    locals: {},
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  } as Response & { body?: unknown; statusCode?: number };

  return res;
}

describe("routeWrap error handling", () => {
  it("returns consistent error shape for thrown errors", async () => {
    const handler = wrap(async () => {
      throw Object.assign(new Error("BROKEN_HANDLER"), { status: 418 });
    });

    const req = { rid: "rid-throw" } as Request;
    const res = createMockRes();

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await handler(req, res, vi.fn() as unknown as NextFunction);

    expect(res.statusCode).toBe(418);
    expect(res.body).toEqual({
      status: "error",
      error: "BROKEN_HANDLER",
      rid: "rid-throw",
    });

    expect(consoleSpy).toHaveBeenCalledWith("[ERROR]", {
      rid: "rid-throw",
      err: expect.any(Error),
    });

    consoleSpy.mockRestore();
  });

  it("includes rid for generated wrapper errors", async () => {
    const handler = wrap(async () => undefined);

    const req = { rid: "rid-empty" } as Request;
    const res = createMockRes();

    await handler(req, res, vi.fn() as unknown as NextFunction);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      status: "error",
      error: "EMPTY_RESPONSE",
      rid: "rid-empty",
    });
  });

  it("normalizes handler error envelopes to a consistent shape", async () => {
    const handler = wrap(async () => ({
      status: "error",
      error: { code: "VALIDATION_FAILED", message: "bad payload" },
    }));

    const req = { rid: "rid-envelope" } as Request;
    const res = createMockRes();

    await handler(req, res, vi.fn() as unknown as NextFunction);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      status: "error",
      error: "bad payload",
      rid: "rid-envelope",
    });
  });
});
