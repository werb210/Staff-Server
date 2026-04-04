"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../app");
describe("security headers", () => {
    it("adds baseline security headers", async () => {
        const res = await (0, supertest_1.default)(app_1.app).get("/health");
        expect(res.headers["x-content-type-options"]).toBe("nosniff");
        expect(res.headers["x-frame-options"]).toBe("DENY");
        expect(res.headers["x-xss-protection"]).toBe("1; mode=block");
    });
});
