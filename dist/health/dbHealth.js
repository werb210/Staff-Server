"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertDatabaseHealthy = assertDatabaseHealthy;
const dbClient_1 = require("../lib/dbClient");
async function assertDatabaseHealthy() {
    try {
        const result = await (0, dbClient_1.testDbConnection)();
        console.log('DB OK:', result);
    }
    catch (err) {
        console.error('DB CONNECTION FAILED:', err);
        throw new Error('DATABASE_CONNECTION_FAILED');
    }
}
