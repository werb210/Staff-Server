"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findIdempotencyRecord = findIdempotencyRecord;
exports.createIdempotencyRecord = createIdempotencyRecord;
const crypto_1 = require("crypto");
const db_1 = require("../../db");
async function findIdempotencyRecord(params) {
    const runner = params.client ?? db_1.pool;
    const res = await runner.query(`select id, actor_user_id, scope, idempotency_key, status_code, response_body, created_at
     from idempotency_keys
     where actor_user_id = $1
       and scope = $2
       and idempotency_key = $3
     limit 1`, [params.actorUserId, params.scope, params.idempotencyKey]);
    return res.rows[0] ?? null;
}
async function createIdempotencyRecord(params) {
    const runner = params.client ?? db_1.pool;
    await runner.query(`insert into idempotency_keys
     (id, actor_user_id, scope, idempotency_key, status_code, response_body, created_at)
     values ($1, $2, $3, $4, $5, $6, now())`, [
        (0, crypto_1.randomUUID)(),
        params.actorUserId,
        params.scope,
        params.idempotencyKey,
        params.statusCode,
        params.responseBody,
    ]);
}
