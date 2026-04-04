"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const app_1 = require("../app");
const metrics_1 = require("../system/metrics");
(0, vitest_1.describe)("server:observability:e2e", () => {
    (0, vitest_1.beforeEach)(() => {
        (0, app_1.resetOtpStateForTests)();
        (0, metrics_1.resetMetrics)();
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.it)("sets x-request-id on all responses", async () => {
        const withProvided = await (0, supertest_1.default)(app_1.app).get("/health").set("x-request-id", "rid-from-client");
        (0, vitest_1.expect)(withProvided.status).toBe(200);
        (0, vitest_1.expect)(typeof withProvided.headers["x-request-id"]).toBe("string");
        (0, vitest_1.expect)(withProvided.headers["x-request-id"]).toHaveLength(36);
        const withoutProvided = await (0, supertest_1.default)(app_1.app).get("/health");
        (0, vitest_1.expect)(withoutProvided.status).toBe(200);
        (0, vitest_1.expect)(typeof withoutProvided.headers["x-request-id"]).toBe("string");
        (0, vitest_1.expect)(withoutProvided.headers["x-request-id"]).toHaveLength(36);
    });
    (0, vitest_1.it)("writes structured JSON access logs", async () => {
        const spy = vitest_1.vi.spyOn(console, "log").mockImplementation(() => undefined);
        const res = await (0, supertest_1.default)(app_1.app).get("/health");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(spy).toHaveBeenCalled();
        const first = spy.mock.calls[0]?.[0];
        (0, vitest_1.expect)(typeof first).toBe("string");
        const entry = JSON.parse(String(first));
        (0, vitest_1.expect)(entry.level).toBe("info");
        (0, vitest_1.expect)(entry.msg).toBe("request");
        (0, vitest_1.expect)(entry.method).toBe("GET");
        (0, vitest_1.expect)(entry.path).toBe("/health");
        (0, vitest_1.expect)(entry.status).toBe(200);
        (0, vitest_1.expect)(typeof entry.rid).toBe("string");
    });
    (0, vitest_1.it)("returns basic request/error counters from /metrics", async () => {
        await (0, supertest_1.default)(app_1.app).get("/health");
        await (0, supertest_1.default)(app_1.app).get("/health");
        const metricsResponse = await (0, supertest_1.default)(app_1.app).get("/metrics");
        (0, vitest_1.expect)(metricsResponse.status).toBe(200);
        (0, vitest_1.expect)(metricsResponse.body.status).toBe("ok");
        (0, vitest_1.expect)(metricsResponse.body.data).toEqual({
            requests: 3,
            errors: 0,
        });
    });
});
