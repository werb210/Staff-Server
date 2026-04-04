"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const routeWrap_1 = require("../lib/routeWrap");
function createMockRes() {
    const res = {
        headersSent: false,
        locals: {},
        statusCode: 200,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        },
    };
    return res;
}
(0, vitest_1.describe)("routeWrap handling", () => {
    (0, vitest_1.it)("forwards errors to next for centralized handling", async () => {
        const handler = (0, routeWrap_1.wrap)(async () => {
            throw Object.assign(new Error("BROKEN_HANDLER"), { status: 418 });
        });
        const req = { rid: "test-rid" };
        const res = createMockRes();
        const next = vitest_1.vi.fn();
        await handler(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(next.mock.calls[0][0].message).toBe("BROKEN_HANDLER");
    });
    (0, vitest_1.it)("does not auto-send when handler resolves undefined", async () => {
        const handler = (0, routeWrap_1.wrap)(async () => undefined);
        const req = {};
        const res = createMockRes();
        const next = vitest_1.vi.fn();
        await handler(req, res, next);
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        (0, vitest_1.expect)(res.body).toBeUndefined();
    });
    (0, vitest_1.it)("does not override explicit successful responses", async () => {
        const handler = (0, routeWrap_1.wrap)(async (_req, response) => {
            response.status(200).json({ status: "ok" });
        });
        const req = {};
        const res = createMockRes();
        const next = vitest_1.vi.fn();
        await handler(req, res, next);
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        (0, vitest_1.expect)(res.body).toEqual({
            status: "ok",
        });
    });
});
