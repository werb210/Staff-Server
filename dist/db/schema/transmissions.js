import { jsonb, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications";
export const transmissionStatusEnum = pgEnum("transmission_status", ["pending", "sent", "delivered", "failed"]);
export const transmissionChannelEnum = pgEnum("transmission_channel", ["email", "sms", "webhook", "sftp", "api"]);
export const transmissions = pgTable("transmissions", {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id").references(() => applications.id, { onDelete: "set null" }),
    channel: transmissionChannelEnum("channel").notNull(),
    status: transmissionStatusEnum("status").default("pending").notNull(),
    requestPayload: jsonb("request_payload"),
    responsePayload: jsonb("response_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
