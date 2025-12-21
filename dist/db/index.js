"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.verifyDatabaseConnection = verifyDatabaseConnection;
exports.closeDatabase = closeDatabase;
exports.assertDatabaseConnection = assertDatabaseConnection;
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema = __importStar(require("./schema"));
const pool_1 = require("./pool");
exports.db = (0, node_postgres_1.drizzle)(pool_1.pool, { schema });
async function verifyDatabaseConnection() {
    const result = await exports.db.execute((0, drizzle_orm_1.sql) `select 1 as ok`);
    return Array.isArray(result.rows) ? result.rows[0]?.ok === 1 : false;
}
async function closeDatabase() {
    await pool_1.pool.end();
}
async function assertDatabaseConnection() {
    try {
        const ok = await verifyDatabaseConnection();
        if (!ok) {
            throw new Error("Database connectivity check failed: SELECT 1 returned unexpected result");
        }
    }
    catch (error) {
        console.error("Database connection failed", error);
        throw error;
    }
}
