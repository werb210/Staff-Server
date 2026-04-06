"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbHealth = dbHealth;
exports.assertDatabaseHealthy = assertDatabaseHealthy;
const db_1 = require("../db");
async function dbHealth() {
    let ok = false;
    try {
        await (0, db_1.dbQuery)("SELECT 1");
        ok = true;
    }
    catch {
        ok = false;
    }
    return { db: ok ? 'ok' : 'fail' };
}
async function assertDatabaseHealthy() {
    try {
        await (0, db_1.dbQuery)("SELECT 1");
    }
    catch {
        throw new Error('database_not_healthy');
    }
}
