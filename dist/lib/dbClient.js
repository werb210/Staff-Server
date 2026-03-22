"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.getDb = getDb;
exports.testDbConnection = testDbConnection;
const pg_1 = require("pg");
let _pool = null;
function createPool() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required');
    }
    return new pg_1.Pool({
        connectionString: process.env.DATABASE_URL,
    });
}
// Primary access (lazy)
function getDb() {
    if (!_pool) {
        if (!process.env.DATABASE_URL) {
            if (process.env.NODE_ENV === 'test') {
                return null;
            }
            throw new Error('DATABASE_URL is required');
        }
        _pool = createPool();
    }
    return _pool;
}
// BACKWARD COMPAT: pool.query()
exports.pool = {
    query: (...args) => {
        const db = getDb();
        if (!db)
            throw new Error('DB not available in test mode');
        return (db).query(...args);
    },
};
// BACKWARD COMPAT: health check
async function testDbConnection() {
    try {
        const db = getDb();
        if (!db)
            return true;
        await db.query('SELECT 1');
        return true;
    }
    catch {
        return false;
    }
}
