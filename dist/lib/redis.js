"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.initRedis = initRedis;
exports.setOtp = setOtp;
exports.getOtp = getOtp;
exports.deleteOtp = deleteOtp;
const ioredis_1 = __importDefault(require("ioredis"));
let redisClient = null;
const isTestMode = process.env.TEST_MODE === "true";
function initRedis() {
    if (isTestMode) {
        console.log("TEST_MODE enabled — skipping Redis connection");
        return null;
    }
    const redisUrl = process.env.REDIS_URL?.trim();
    if (!redisUrl) {
        console.log("Redis disabled: REDIS_URL not provided");
        return null;
    }
    if (redisClient) {
        return redisClient;
    }
    redisClient = new ioredis_1.default(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
    });
    redisClient.on("ready", () => console.log("REDIS CONNECTED"));
    redisClient.on("error", (error) => {
        console.error("REDIS ERROR", error.message);
    });
    return redisClient;
}
exports.redis = isTestMode ? null : initRedis();
function requireRedis() {
    if (!exports.redis) {
        throw new Error("Redis is disabled because REDIS_URL is missing");
    }
    return exports.redis;
}
async function setOtp(phone, code) {
    await requireRedis().set(`otp:${phone}`, code, "EX", 300);
}
async function getOtp(phone) {
    return requireRedis().get(`otp:${phone}`);
}
async function deleteOtp(phone) {
    await requireRedis().del(`otp:${phone}`);
}
