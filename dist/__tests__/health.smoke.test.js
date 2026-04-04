"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../app");
describe("Health check", () => {
    it("GET /health returns ok", async () => {
        const res = await (0, supertest_1.default)(app_1.app).get("/health");
        expect(res.body).toEqual({ status: "ok", data: {} });
    });
});
