"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pool_1 = require("./pool");
exports.db = (0, node_postgres_1.drizzle)(pool_1.pool);
