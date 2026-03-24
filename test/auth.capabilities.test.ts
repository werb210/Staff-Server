import { describe, expect, it } from "vitest";
import { requireCapability } from "../src/middleware/auth";

describe("Auth capabilities", () => {
  it("returns 403 for forbidden capability", () => {
    const middleware = requireCapability("leads:write");
    const req: any = { id: "req-1", user: { capabilities: ["leads:read"] } };
    const res: any = { status: (code: number) => ({ json: (body: any) => ({ code, body }) }) };
    const next = () => ({ reached: true });

    const result = middleware(req, res, next as any) as any;
    expect(result.code).toBe(403);
  });
});
