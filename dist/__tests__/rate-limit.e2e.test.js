"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../app");
describe("public rate limiting", () => {
    it("limits excessive requests", async () => {
        for (let i = 0; i < 100; i += 1) {
            await (0, supertest_1.default)(app_1.app).get("/api/v1/public/test");
        }
        const res = await (0, supertest_1.default)(app_1.app).get("/api/v1/public/test");
        expect(res.status).toBe(429);
        expect(res.headers["retry-after"]).toBe("1");
        expect(res.body).toHaveProperty("status", "error");
        expect(typeof res.body.error).toBe("string");
        expect(typeof res.body.rid).toBe("string");
    });
});
