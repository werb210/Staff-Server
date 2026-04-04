"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("../../config/env");
const env_2 = require("../../system/env");
describe("system/env", () => {
    const originalEnv = process.env;
    beforeEach(() => {
        process.env = { ...originalEnv };
        (0, env_1.resetEnvCacheForTests)();
    });
    afterEach(() => {
        process.env = originalEnv;
        (0, env_1.resetEnvCacheForTests)();
    });
    it("uses default PORT when PORT is missing", () => {
        delete process.env.PORT;
        process.env.JWT_SECRET = "secret";
        process.env.DB_URL = "postgres://localhost:5432/test";
        expect(() => (0, env_2.validateEnv)()).not.toThrow();
    });
    it("does not throw when JWT_SECRET is missing in test environment", () => {
        process.env.NODE_ENV = "test";
        process.env.PORT = String(Date.now());
        delete process.env.JWT_SECRET;
        process.env.DB_URL = "postgres://localhost:5432/test";
        expect(() => (0, env_2.validateEnv)()).not.toThrow();
    });
});
