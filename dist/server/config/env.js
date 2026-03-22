"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateServerEnv = validateServerEnv;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string().min(1),
    JWT_SECRET: zod_1.z.string().min(1),
    TWILIO_ACCOUNT_SID: zod_1.z.string().min(1),
    TWILIO_AUTH_TOKEN: zod_1.z.string().min(1),
    TWILIO_PHONE_NUMBER: zod_1.z.string().min(1),
    SENDGRID_API_KEY: zod_1.z.string().min(1),
    WEBSITE_URL: zod_1.z.string().url().optional(),
    PORTAL_URL: zod_1.z.string().url().optional(),
    CLIENT_URL: zod_1.z.string().url().optional(),
    FRONTEND_URL: zod_1.z.string().url().optional(),
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]),
    GA_ID: zod_1.z.string().min(1).optional(),
    SENTRY_DSN: zod_1.z.string().min(1).optional(),
});
let cachedEnv = null;
function validateServerEnv() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    if (cachedEnv) {
        return cachedEnv;
    }
    const nodeEnv = process.env.NODE_ENV ?? "development";
    if (nodeEnv !== "production") {
        process.env.NODE_ENV = nodeEnv;
        (_a = process.env).DATABASE_URL || (_a.DATABASE_URL = "postgres://postgres:postgres@localhost:5432/staff_dev");
        (_b = process.env).JWT_SECRET || (_b.JWT_SECRET = "dev-jwt-secret");
        (_c = process.env).TWILIO_ACCOUNT_SID || (_c.TWILIO_ACCOUNT_SID = "AC00000000000000000000000000000000");
        (_d = process.env).TWILIO_AUTH_TOKEN || (_d.TWILIO_AUTH_TOKEN = "dev-twilio-token");
        (_e = process.env).TWILIO_PHONE_NUMBER || (_e.TWILIO_PHONE_NUMBER = "+10000000000");
        (_f = process.env).SENDGRID_API_KEY || (_f.SENDGRID_API_KEY = "dev-sendgrid-key");
        (_g = process.env).CORS_ALLOWED_ORIGINS || (_g.CORS_ALLOWED_ORIGINS = "http://localhost:5173");
        (_h = process.env).RATE_LIMIT_WINDOW_MS || (_h.RATE_LIMIT_WINDOW_MS = "60000");
        (_j = process.env).RATE_LIMIT_MAX || (_j.RATE_LIMIT_MAX = "200");
        (_k = process.env).APPINSIGHTS_CONNECTION_STRING || (_k.APPINSIGHTS_CONNECTION_STRING = "InstrumentationKey=dev");
        (_l = process.env).JWT_EXPIRES_IN || (_l.JWT_EXPIRES_IN = "15m");
        (_m = process.env).JWT_REFRESH_EXPIRES_IN || (_m.JWT_REFRESH_EXPIRES_IN = "30d");
    }
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        const missingOrInvalid = parsed.error.issues.map((issue) => issue.path.join("."));
        throw new Error(`Invalid server environment configuration: ${missingOrInvalid.join(", ")}`);
    }
    cachedEnv = parsed.data;
    return cachedEnv;
}
