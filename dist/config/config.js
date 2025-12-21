"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authConfig = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const isProd = process.env.NODE_ENV === "production";
const devDefaults = isProd
    ? {}
    : {
        DATABASE_URL: "postgres://postgres:postgres@localhost:5432/postgres",
        JWT_SECRET: "dev-jwt-secret-01234567890123456789012",
        ACCESS_TOKEN_SECRET: "dev-access-secret-0123456789012345",
    };
const env = { ...devDefaults, ...process.env };
/**
 * Helpers
 */
const asInt = (v, fallback) => {
    const n = typeof v === "string" ? Number(v) : NaN;
    return Number.isFinite(n) ? n : fallback;
};
/**
 * Base env (always required)
 */
const baseSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string().min(1, "DATABASE_URL is required"),
    JWT_SECRET: zod_1.z.string().min(32, "JWT_SECRET must be at least 32 chars"),
    NODE_ENV: zod_1.z.string().optional(),
    PORT: zod_1.z.string().optional(),
});
/**
 * Auth / token env (required for auth module)
 */
const authSchema = zod_1.z.object({
    TOKEN_TRANSPORT: zod_1.z.literal("header"),
    ACCESS_TOKEN_SECRET: zod_1.z.string().min(32, "ACCESS_TOKEN_SECRET must be at least 32 chars"),
    ACCESS_TOKEN_EXPIRES_IN: zod_1.z.string().optional(), // seconds
});
/**
 * Twilio (optional, but must exist as properties because services reference them)
 */
const twilioSchema = zod_1.z
    .object({
    TWILIO_ACCOUNT_SID: zod_1.z.string().min(1, "TWILIO_ACCOUNT_SID is required"),
    TWILIO_AUTH_TOKEN: zod_1.z.string().min(1, "TWILIO_AUTH_TOKEN is required"),
    TWILIO_VERIFY_SERVICE_SID: zod_1.z
        .string()
        .min(1, "TWILIO_VERIFY_SERVICE_SID is required for 2FA"),
    TWILIO_PHONE_NUMBER_BF: zod_1.z.string().optional(),
    TWILIO_PHONE_NUMBER_SLF: zod_1.z.string().optional(),
})
    .partial();
/**
 * Azure Blob is REQUIRED only in production
 */
const azureBlobSchema = zod_1.z.object({
    AZURE_BLOB_ACCOUNT: zod_1.z.string().min(1, "AZURE_BLOB_ACCOUNT is required in production"),
    AZURE_BLOB_KEY: zod_1.z.string().min(1, "AZURE_BLOB_KEY is required in production"),
    AZURE_BLOB_CONTAINER: zod_1.z.string().min(1, "AZURE_BLOB_CONTAINER is required in production"),
});
/**
 * Optional / legacy compat
 */
const optionalSchema = zod_1.z.object({
    AZURE_POSTGRES_URL: zod_1.z.string().optional(),
});
let parsedBase;
let parsedAuth;
let parsedTwilio;
let parsedOptional;
let parsedAzureBlob;
try {
    parsedBase = baseSchema.parse(env);
    parsedAuth = authSchema.parse(env);
    parsedTwilio = twilioSchema.parse(env);
    const twilioKeysProvided = [
        parsedTwilio.TWILIO_ACCOUNT_SID,
        parsedTwilio.TWILIO_AUTH_TOKEN,
        parsedTwilio.TWILIO_VERIFY_SERVICE_SID,
    ].filter(Boolean).length;
    if (twilioKeysProvided > 0 &&
        !(parsedTwilio.TWILIO_ACCOUNT_SID && parsedTwilio.TWILIO_AUTH_TOKEN && parsedTwilio.TWILIO_VERIFY_SERVICE_SID)) {
        console.warn("Twilio configuration incomplete; Twilio features will be disabled.");
    }
    parsedOptional = optionalSchema.parse(env);
}
catch (err) {
    const message = err instanceof zod_1.z.ZodError
        ? err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ")
        : String(err);
    throw new Error(`Invalid environment configuration: ${message}`);
}
if (isProd) {
    try {
        parsedAzureBlob = azureBlobSchema.parse(process.env);
    }
    catch (err) {
        const message = err instanceof zod_1.z.ZodError
            ? err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ")
            : String(err);
        throw new Error(`Azure Blob configuration missing in production: ${message}`);
    }
}
/**
 * Exported configs
 * IMPORTANT: use `undefined` for “not set” (NOT `null`) to avoid TS2322 string|null errors.
 */
exports.config = {
    DATABASE_URL: parsedBase.DATABASE_URL,
    JWT_SECRET: parsedBase.JWT_SECRET,
    NODE_ENV: parsedBase.NODE_ENV ?? "development",
    PORT: asInt(parsedBase.PORT, 5000),
    // Azure Blob (undefined in dev, required in prod)
    AZURE_BLOB_ACCOUNT: parsedAzureBlob?.AZURE_BLOB_ACCOUNT,
    AZURE_BLOB_KEY: parsedAzureBlob?.AZURE_BLOB_KEY,
    AZURE_BLOB_CONTAINER: parsedAzureBlob?.AZURE_BLOB_CONTAINER,
    // Optional / legacy
    AZURE_POSTGRES_URL: parsedOptional.AZURE_POSTGRES_URL,
    // Twilio (optional values but always-present properties)
    TWILIO_ACCOUNT_SID: parsedTwilio.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: parsedTwilio.TWILIO_AUTH_TOKEN,
    TWILIO_VERIFY_SERVICE_SID: parsedTwilio.TWILIO_VERIFY_SERVICE_SID,
    TWILIO_PHONE_NUMBER_BF: parsedTwilio.TWILIO_PHONE_NUMBER_BF,
    TWILIO_PHONE_NUMBER_SLF: parsedTwilio.TWILIO_PHONE_NUMBER_SLF,
};
exports.authConfig = {
    TOKEN_TRANSPORT: parsedAuth.TOKEN_TRANSPORT,
    ACCESS_TOKEN_SECRET: parsedAuth.ACCESS_TOKEN_SECRET,
    // default: 15m access (seconds)
    ACCESS_TOKEN_EXPIRES_IN: asInt(parsedAuth.ACCESS_TOKEN_EXPIRES_IN, 60 * 15),
};
