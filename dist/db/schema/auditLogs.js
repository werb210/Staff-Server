"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogs = exports.auditEventEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
exports.auditEventEnum = (0, pg_core_1.pgEnum)("audit_event_type", ["login_success", "login_failure"]);
exports.auditLogs = (0, pg_core_1.pgTable)("audit_logs", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => users_1.users.id, { onDelete: "set null" }),
    emailAttempt: (0, pg_core_1.text)("email_attempt").notNull(),
    eventType: (0, exports.auditEventEnum)("event_type").notNull(),
    ipAddress: (0, pg_core_1.text)("ip_address"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    timestamp: (0, pg_core_1.timestamp)("timestamp", { withTimezone: true }).defaultNow().notNull(),
});
