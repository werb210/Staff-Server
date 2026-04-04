"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../app"); // adjust if different
describe("End-to-End Application Flow", () => {
    let app;
    beforeAll(async () => {
        app = await (0, app_1.buildApp)();
    });
    test("login", async () => {
        const res = await (0, supertest_1.default)(app)
            .post("/auth/login")
            .send({ email: "test@test.com", password: "password" });
        expect(res.status).toBeLessThan(500);
    });
    test("create application", async () => {
        const res = await (0, supertest_1.default)(app)
            .post("/applications")
            .send({ name: "Test App" });
        expect(res.status).toBeLessThan(500);
    });
    test("fetch pipeline", async () => {
        const res = await (0, supertest_1.default)(app).get("/pipeline");
        expect(res.status).toBeLessThan(500);
    });
});
