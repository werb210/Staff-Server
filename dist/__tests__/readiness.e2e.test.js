"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const app_1 = require("../app");
const deps_1 = require("../system/deps");
(0, vitest_1.describe)("server:readiness:e2e", () => {
    let app;
    beforeAll(async () => {
        app = await (0, app_1.createApp)();
    });
    (0, vitest_1.beforeEach)(() => {
        (0, app_1.resetOtpStateForTests)();
        vitest_1.vi.useFakeTimers();
        vitest_1.vi.setSystemTime(new Date(Date.now() + 60000));
        deps_1.deps.db.ready = false;
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.useRealTimers();
    });
    (0, vitest_1.it)("returns 200 from /health regardless of readiness", async () => {
        deps_1.deps.db.ready = false;
        const notReady = await (0, supertest_1.default)(app).get("/health");
        (0, vitest_1.expect)(notReady.status).toBe(200);
        (0, vitest_1.expect)(notReady.body).toEqual({ status: "ok", data: {} });
        deps_1.deps.db.ready = true;
        const ready = await (0, supertest_1.default)(app).get("/health");
        (0, vitest_1.expect)(ready.status).toBe(200);
        (0, vitest_1.expect)(ready.body).toEqual({ status: "ok", data: {} });
    });
    (0, vitest_1.it)("returns 503 from /ready when not ready and 200 when ready", async () => {
        deps_1.deps.db.ready = false;
        const notReady = await (0, supertest_1.default)(app).get("/ready");
        (0, vitest_1.expect)(notReady.status).toBe(503);
        (0, vitest_1.expect)(notReady.body).toEqual({ status: "error", error: "not_ready" });
        deps_1.deps.db.ready = true;
        const ready = await (0, supertest_1.default)(app).get("/ready");
        (0, vitest_1.expect)(ready.status).toBe(200);
        (0, vitest_1.expect)(ready.body).toEqual({ status: "ok", data: {} });
    });
});
