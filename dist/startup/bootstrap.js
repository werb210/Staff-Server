"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrap = bootstrap;
const redis_1 = require("../lib/redis");
const config_1 = require("../config");
const db_1 = require("../db");
async function bootstrap() {
    await (0, db_1.dbQuery)("SELECT 1");
    const redis = (0, redis_1.getRedis)();
    if (config_1.config.redis.url && config_1.config.env !== "test" && redis) {
        try {
            if (redis.ping) {
                await redis.ping();
            }
        }
        catch {
            console.warn("Redis unavailable — continuing");
        }
    }
}
