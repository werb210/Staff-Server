import { describe, expect, it, vi, beforeEach } from "vitest";
import { hashRequest } from "../src/utils/hash";

vi.mock("../src/config", () => ({
  config: { env: "production" },
}));

const getIdempotent = vi.fn();
const setIdempotent = vi.fn(async () => undefined);
vi.mock("../src/infra/idempotencyRedis", () => ({
  getIdempotent,
  setIdempotent,
}));

describe("Idempotency middleware", () => {
  beforeEach(() => {
    getIdempotent.mockReset();
    setIdempotent.mockReset();
    setIdempotent.mockResolvedValue(undefined);
  });

  it("returns 200 for duplicate idempotency key", async () => {
    const { idempotencyMiddleware } = await import("../src/middleware/idempotency");
    getIdempotent.mockResolvedValue({ requestHash: hashRequest({ a: 1 }), response: { ok: true } });

    const req: any = { method: "POST", path: "/api/leads", body: { a: 1 }, get: () => "abcde12345" };
    let body: any;
    const res: any = {
      statusCode: 200,
      status: vi.fn(() => res),
      json: vi.fn((payload: any) => {
        body = payload;
        return res;
      }),
    };

    await idempotencyMiddleware(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.status).toBe("duplicate");
  });

  it("returns 409 on payload mismatch", async () => {
    const { idempotencyMiddleware } = await import("../src/middleware/idempotency");
    getIdempotent.mockResolvedValue({ requestHash: "different", response: { ok: true } });

    const req: any = { method: "POST", path: "/api/leads", body: { changed: true }, get: () => "abcde12345" };
    const res: any = { statusCode: 200, status: vi.fn(() => res), json: vi.fn(() => res) };

    await idempotencyMiddleware(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(409);
  });
});
