"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnv = getEnv;
exports.validateRuntimeEnvOrExit = validateRuntimeEnvOrExit;
exports.resetEnvCacheForTests = resetEnvCacheForTests;
let cached;
function getEnv() {
    if (!cached) {
        const nodeEnv = process.env.NODE_ENV;
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret && nodeEnv !== "test") {
            throw new Error("❌ Missing env: JWT_SECRET");
        }
        cached = {
            PORT: process.env.PORT,
            NODE_ENV: nodeEnv,
            JWT_SECRET: jwtSecret ?? "test-secret",
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        };
    }
    return cached;
}
function validateRuntimeEnvOrExit() {
    const required = ["DATABASE_URL", "JWT_SECRET", "OPENAI_API_KEY"];
    for (const key of required) {
        if (!process.env[key]) {
            throw new Error(`❌ Missing env: ${key}`);
        }
    }
    return getEnv();
}
function resetEnvCacheForTests() {
    cached = undefined;
}
