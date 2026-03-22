"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveLenderCount = getActiveLenderCount;
const db_1 = require("../db");
async function getActiveLenderCount() {
    const result = await (0, db_1.dbQuery)("select count(*)::int as count from lenders where active = true");
    return result.rows[0]?.count ?? 0;
}
