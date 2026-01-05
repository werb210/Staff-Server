"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAuditEvent = recordAuditEvent;
const crypto_1 = require("crypto");
const db_1 = require("../../db");
const requestContext_1 = require("../../middleware/requestContext");
async function recordAuditEvent(params) {
    const runner = params.client ?? db_1.pool;
    const requestId = params.requestId ?? (0, requestContext_1.getRequestId)() ?? null;
    await runner.query(`insert into audit_events
     (id, actor_user_id, target_user_id, target_type, target_id, action, ip, user_agent, request_id, success, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())`, [
        (0, crypto_1.randomUUID)(),
        params.actorUserId,
        params.targetUserId,
        params.targetType ?? null,
        params.targetId ?? null,
        params.action,
        params.ip ?? null,
        params.userAgent ?? null,
        requestId,
        params.success,
    ]);
}
