import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { transmissionChannelEnum, transmissionStatusEnum } from "./enums.js";
import { communications } from "./messages.js";

export const transmissionLogs = pgTable("transmission_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  communicationId: uuid("communication_id").references(() => communications.id, { onDelete: "set null" }),
  channel: transmissionChannelEnum("channel").notNull(),
  status: transmissionStatusEnum("status").notNull().default("pending"),
  requestPayload: jsonb("request_payload"),
  responsePayload: jsonb("response_payload"),
  externalId: text("external_id"),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
