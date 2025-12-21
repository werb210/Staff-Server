"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transmissions = exports.transmissionChannelEnum = exports.transmissionStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const applications_1 = require("./applications");
exports.transmissionStatusEnum = (0, pg_core_1.pgEnum)("transmission_status", ["pending", "sent", "delivered", "failed"]);
exports.transmissionChannelEnum = (0, pg_core_1.pgEnum)("transmission_channel", ["email", "sms", "webhook", "sftp", "api"]);
exports.transmissions = (0, pg_core_1.pgTable)("transmissions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    applicationId: (0, pg_core_1.uuid)("application_id").references(() => applications_1.applications.id, { onDelete: "set null" }),
    channel: (0, exports.transmissionChannelEnum)("channel").notNull(),
    status: (0, exports.transmissionStatusEnum)("status").default("pending").notNull(),
    requestPayload: (0, pg_core_1.jsonb)("request_payload"),
    responsePayload: (0, pg_core_1.jsonb)("response_payload"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
});
