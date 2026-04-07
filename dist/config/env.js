"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnv = getEnv;
exports.validateRuntimeEnvOrExit = validateRuntimeEnvOrExit;
exports.resetEnvCacheForTests = resetEnvCacheForTests;
const TEST_JWT_SECRET = "test-secret";
let cached;
function getEnv() {
    if (!cached) {
        cached = {
            PORT: process.env.PORT,
            NODE_ENV: process.env.NODE_ENV,
            JWT_SECRET: process.env.JWT_SECRET || TEST_JWT_SECRET,
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        };
    }
    return cached;
}
function validateRuntimeEnvOrExit() {
    const required = ["DATABASE_URL", "JWT_SECRET", "OPENAI_API_KEY"];
    for (const key of required) {
        if (!process.env[key]) {
            console.error(`❌ Missing env: ${key}`);
            process.exit(1);
        }
    }
    return getEnv();
}
function resetEnvCacheForTests() {
    cached = undefined;
}
