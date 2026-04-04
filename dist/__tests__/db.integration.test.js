"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../lib/db");
describe("test db integration", () => {
    test("fails hard when db pool is not initialized", async () => {
        delete process.env.DATABASE_URL;
        await expect((0, db_1.runQuery)("SELECT 1")).rejects.toThrow("DB_POOL_NOT_INITIALIZED");
    });
    test("rejects invalid queries early", async () => {
        await expect((0, db_1.runQuery)("   ")).rejects.toThrow(/non-empty SQL query string/i);
        await expect((0, db_1.runQuery)("SELECT $1::text", [undefined])).rejects.toThrow(/must not include undefined/i);
    });
});
