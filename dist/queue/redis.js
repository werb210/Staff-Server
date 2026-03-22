"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConnection = void 0;
const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
exports.redisConnection = {
    url: redisUrl,
    maxRetriesPerRequest: null,
};
