"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = require("../app");
describe("auth middleware enforcement", () => {
    const originalSecret = process.env.JWT_SECRET;
    beforeAll(() => {
        process.env.JWT_SECRET = "test-secret";
    });
    afterAll(() => {
        if (originalSecret === undefined) {
            delete process.env.JWT_SECRET;
            return;
        }
        process.env.JWT_SECRET = originalSecret;
    });
    it("returns canonical 401 envelope when auth header is missing", async () => {
        const res = await (0, supertest_1.default)(app_1.app).post("/api/v1/leads").send({ leadId: "1" });
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ status: "error", error: "Unauthorized" });
    });
    it("returns success with valid JWT token", async () => {
        const token = jsonwebtoken_1.default.sign({ userId: "test-user", role: "tester" }, "test-secret", {
            expiresIn: "1h",
        });
        const res = await (0, supertest_1.default)(app_1.app)
            .post("/api/v1/calls/start")
            .set("Authorization", `Bearer ${token}`)
            .send({ callId: "call-1" });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: "ok", data: { started: true } });
    });
});
