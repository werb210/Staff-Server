"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const app_1 = require("../app");
const jwt_1 = require("../auth/jwt");
const capabilities_1 = require("../auth/capabilities");
const db_1 = require("../db");
(0, vitest_1.describe)("server:contract:e2e", () => {
    const authHeader = () => `Bearer ${(0, jwt_1.signJwt)({
        userId: "test-user",
        role: "Admin",
        capabilities: [capabilities_1.CAPABILITIES.COMMUNICATIONS_CALL],
    })}`;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.spyOn(db_1.pool, "query").mockResolvedValue({ rows: [{ count: "0" }] });
    });
    function expectContractEnvelope(body) {
        (0, vitest_1.expect)(body).toHaveProperty("status");
        (0, vitest_1.expect)(typeof body.rid).toBe("string");
        if (body.status === "ok") {
            (0, vitest_1.expect)(body).toHaveProperty("data");
            return;
        }
        (0, vitest_1.expect)(body).toHaveProperty("error");
        (0, vitest_1.expect)(typeof body.error).toBe("string");
    }
    (0, vitest_1.it)("supports canonical dialer token route", async () => {
        const res = await (0, supertest_1.default)(app_1.app)
            .get("/api/v1/voice/token")
            .set("Authorization", authHeader());
        (0, vitest_1.expect)(res.status).toBe(200);
        expectContractEnvelope(res.body);
    });
    (0, vitest_1.it)("supports canonical call start route", async () => {
        const res = await (0, supertest_1.default)(app_1.app)
            .post("/api/v1/call/start")
            .set("Authorization", authHeader())
            .send({ to: "+61400000000" });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body).toHaveProperty("status", "ok");
        (0, vitest_1.expect)(res.body).toHaveProperty("data");
        (0, vitest_1.expect)(res.body.data).toHaveProperty("callId");
        (0, vitest_1.expect)(res.body.data).toHaveProperty("status", "queued");
    });
    (0, vitest_1.it)("supports canonical voice status route", async () => {
        const res = await (0, supertest_1.default)(app_1.app)
            .post("/api/v1/voice/status")
            .set("Authorization", authHeader())
            .send({ callId: "call-123", status: "completed" });
        (0, vitest_1.expect)(res.status).toBe(200);
        expectContractEnvelope(res.body);
    });
    (0, vitest_1.it)("returns structured errors for legacy route aliases", async () => {
        const res = await (0, supertest_1.default)(app_1.app).get("/api/public/test");
        (0, vitest_1.expect)(res.status).toBe(410);
        expectContractEnvelope(res.body);
        (0, vitest_1.expect)(res.body.error).toBe("LEGACY_ROUTE_DISABLED");
    });
});
