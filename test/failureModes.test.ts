import { describe, expect, it } from "vitest";
import { requireAuth, requireAuthorization } from "../src/middleware/auth";

describe("Failure modes", () => {
  it("returns 401 for unauthorized requests", () => {
    const req: any = { id: "req-1", headers: {}, log: { warn: () => undefined } };
    const res: any = { status: (code: number) => ({ json: (body: any) => ({ code, body }) }) };

    const result = requireAuth(req, res, (() => undefined) as any) as any;
    expect(result.code).toBe(401);
  });

  it("returns 403 for forbidden role", () => {
    const middleware = requireAuthorization({ roles: ["admin"] });
    const req: any = { id: "req-2", user: { role: "viewer", capabilities: [] } };
    const res: any = { status: (code: number) => ({ json: (body: any) => ({ code, body }) }) };

    const result = middleware(req, res, (() => undefined) as any) as any;
    expect(result.code).toBe(403);
  });
});
