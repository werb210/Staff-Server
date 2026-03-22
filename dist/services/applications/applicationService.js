"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestIncompleteApplication = getLatestIncompleteApplication;
const db_1 = require("../../db");
async function getLatestIncompleteApplication(userId) {
    const result = await db_1.pool.query(`select *
     from applications
     where owner_user_id = $1
       and lower(coalesce(pipeline_state, '')) not in ('submitted', 'funded', 'rejected')
     order by created_at desc
     limit 1`, [userId]);
    return result.rows[0] ?? null;
}
