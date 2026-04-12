import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it, vi } from "vitest";

import { auth } from "../middleware/auth.js";

function createResponse() {
  const response = {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      return this;
    },
  } as unknown as Response & { statusCode: number; payload?: unknown };

  return response;
}

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.JWT_SECRET;
});

describe("auth middleware token parsing", () => {
  it("accepts a Bearer token", () => {
    process.env.JWT_SECRET = "test-secret";
    const token = jwt.sign({ id: "user-1", role: "Staff" }, process.env.JWT_SECRET);

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    auth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as any).user?.userId).toBe("user-1");
  });

  it("accepts a token from cookies for credentialed browser calls", () => {
    process.env.JWT_SECRET = "test-secret";
    const token = jwt.sign({ id: "user-2", role: "Staff" }, process.env.JWT_SECRET);

    const req = {
      headers: {},
      cookies: {
        accessToken: token,
      },
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    auth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as any).user?.userId).toBe("user-2");
  });
});
