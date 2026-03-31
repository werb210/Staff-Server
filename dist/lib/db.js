"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryDb = exports.db = exports.prisma = void 0;
exports.getPrisma = getPrisma;
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
let prismaInstance = null;
function getPrisma() {
    if (!prismaInstance) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { PrismaClient } = require("@prisma/client");
        prismaInstance = new PrismaClient();
    }
    return prismaInstance;
}
exports.prisma = new Proxy({}, {
    get: (_target, prop, receiver) => Reflect.get(getPrisma(), prop, receiver)
});
exports.db = exports.prisma;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
async function queryWithRetry(text, params = [], retries = 3) {
    try {
        return await pool.query(text, params);
    }
    catch (err) {
        if (retries <= 0)
            throw err;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return queryWithRetry(text, params, retries - 1);
    }
}
exports.queryDb = {
    query: queryWithRetry
};
