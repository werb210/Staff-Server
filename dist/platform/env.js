"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = exports.envSchema = void 0;
const zod_1 = require("zod");
exports.envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.string().default("development"),
    PORT: zod_1.z.string().default("3000"),
    DATABASE_URL: zod_1.z.string().default("postgres://postgres:postgres@localhost:5432/staff_dev"),
    JWT_SECRET: zod_1.z.string().default("dev-jwt-secret"),
    TWILIO_ACCOUNT_SID: zod_1.z.string().optional(),
    TWILIO_AUTH_TOKEN: zod_1.z.string().optional(),
    STORAGE_PROVIDER: zod_1.z.string().optional(),
    SERVICE_NAME: zod_1.z.string().default("bf-server"),
    LOG_LEVEL: zod_1.z.string().optional(),
    CLIENT_URL: zod_1.z.string().optional(),
    PORTAL_URL: zod_1.z.string().optional(),
    WEBSITE_URL: zod_1.z.string().optional(),
    PRINT_ROUTES: zod_1.z.string().optional(),
});
const envSource = process.env.NODE_ENV === "test"
    ? {
        DATABASE_URL: process.env.DATABASE_URL ||
            "postgres://test:test@localhost:5432/test",
        JWT_SECRET: process.env.JWT_SECRET || "test-secret",
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "test-refresh",
        ...process.env,
    }
    : process.env;
exports.env = exports.envSchema.parse(envSource);
