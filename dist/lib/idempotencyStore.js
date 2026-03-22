"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoredResponse = getStoredResponse;
exports.storeResponse = storeResponse;
exports.resetIdempotencyStoreForTests = resetIdempotencyStoreForTests;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../observability/logger");
const ONE_HOUR_IN_SECONDS = 60 * 60;
const ONE_HOUR_IN_MILLISECONDS = ONE_HOUR_IN_SECONDS * 1000;
const REDIS_KEY_PREFIX = "idempotency:";
const memoryStore = new Map();
let redisClient = null;
let redisReady = false;
let redisAttempted = false;
function getRedisClient() {
    if (redisAttempted) {
        return redisReady ? redisClient : null;
    }
    redisAttempted = true;
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        return null;
    }
    const client = new ioredis_1.default(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
    });
    void client
        .connect()
        .then(() => {
        redisClient = client;
        redisReady = true;
    })
        .catch((error) => {
        redisReady = false;
        void client.disconnect();
        (0, logger_1.logWarn)("idempotency_redis_unavailable", {
            error: error instanceof Error ? error.message : "redis_connect_failed",
        });
    });
    return null;
}
function memoryFallbackGet(key) {
    return memoryStore.get(key);
}
function memoryFallbackSet(key, value) {
    memoryStore.set(key, value);
    setTimeout(() => {
        memoryStore.delete(key);
    }, ONE_HOUR_IN_MILLISECONDS);
}
async function getStoredResponse(key) {
    const client = getRedisClient();
    if (client) {
        try {
            const payload = await client.get(`${REDIS_KEY_PREFIX}${key}`);
            if (!payload) {
                return undefined;
            }
            return JSON.parse(payload);
        }
        catch {
            return memoryFallbackGet(key);
        }
    }
    return memoryFallbackGet(key);
}
async function storeResponse(key, value) {
    const client = getRedisClient();
    if (client) {
        try {
            await client.set(`${REDIS_KEY_PREFIX}${key}`, JSON.stringify(value), "EX", ONE_HOUR_IN_SECONDS);
            return;
        }
        catch {
            memoryFallbackSet(key, value);
            return;
        }
    }
    memoryFallbackSet(key, value);
}
function resetIdempotencyStoreForTests() {
    if (process.env.NODE_ENV === "test") {
        memoryStore.clear();
    }
}
