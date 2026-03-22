"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.pool = void 0;
exports.query = query;
exports.getClient = getClient;
exports.dbQuery = dbQuery;
exports.assertPoolHealthy = assertPoolHealthy;
exports.checkDb = checkDb;
exports.warmUpDatabase = warmUpDatabase;
exports.getInstrumentedClient = getInstrumentedClient;
exports.setDbTestPoolMetricsOverride = setDbTestPoolMetricsOverride;
exports.setDbTestFailureInjection = setDbTestFailureInjection;
exports.clearDbTestFailureInjection = clearDbTestFailureInjection;
const pg_1 = __importDefault(require("pg"));
const logger_1 = require("./observability/logger");
const startupState_1 = require("./startupState");
const { Pool } = pg_1.default;
function buildPoolConfig() {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) {
        if (process.env.NODE_ENV === "test") {
            return {
                connectionString: "postgres://test:test@127.0.0.1:5432/test",
                ssl: false,
                max: Number(process.env.DB_POOL_MAX ?? 20),
            };
        }
        if (process.env.NODE_ENV !== "production") {
            return {
                connectionString: "postgres://postgres:postgres@127.0.0.1:5432/staff_dev",
                ssl: false,
                max: Number(process.env.DB_POOL_MAX ?? 20),
            };
        }
        (0, startupState_1.markNotReady)("db_unavailable");
        throw new Error("DATABASE_URL is missing");
    }
    const isAzure = connectionString.includes("postgres.database.azure.com");
    const isLocal = connectionString.includes("localhost") ||
        connectionString.includes("127.0.0.1");
    return {
        connectionString,
        ssl: isAzure ? { rejectUnauthorized: true } : isLocal ? false : false,
        max: Number(process.env.DB_POOL_MAX ?? 20),
    };
}
exports.pool = new Pool(buildPoolConfig());
exports.db = exports.pool;
function query(text, params) {
    return exports.pool.query(text, params);
}
function getClient() {
    return exports.pool;
}
async function dbQuery(text, params) {
    try {
        return await exports.pool.query(text, params);
    }
    catch (err) {
        (0, logger_1.logError)("db_query_error", { message: err.message, code: err.code });
        throw err;
    }
}
function assertPoolHealthy() {
    const waitingCount = (exports.pool).waitingCount ?? 0;
    const totalCount = (exports.pool).totalCount ?? 0;
    const max = (exports.pool).options?.max ?? 0;
    if (max > 0 && waitingCount > 0 && totalCount >= max) {
        throw new Error("db_pool_exhausted");
    }
}
async function checkDb() {
    await exports.pool.query("select 1");
}
async function warmUpDatabase() {
    await exports.pool.query("select 1");
    assertPoolHealthy();
}
async function getInstrumentedClient() {
    return exports.pool.connect();
}
function setDbTestPoolMetricsOverride() {
    // no-op in production
}
function setDbTestFailureInjection() {
    // no-op in production
}
function clearDbTestFailureInjection() {
    // no-op in production
}
exports.pool.on("connect", () => (0, logger_1.logInfo)("db_client_connected"));
exports.pool.on("error", (err) => {
    (0, startupState_1.markNotReady)("db_unavailable");
    (0, logger_1.logWarn)("db_connection_error", { message: err.message });
});
