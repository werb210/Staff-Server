"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiTrainingChunks = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const applications_1 = require("./applications");
const documents_1 = require("./documents");
const users_1 = require("./users");
exports.aiTrainingChunks = (0, pg_core_1.pgTable)("ai_training_chunks", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    applicationId: (0, pg_core_1.uuid)("application_id")
        .references(() => applications_1.applications.id, { onDelete: "cascade" })
        .notNull(),
    documentVersionId: (0, pg_core_1.uuid)("document_version_id").references(() => documents_1.documentVersions.id, { onDelete: "set null" }),
    userId: (0, pg_core_1.uuid)("user_id").references(() => users_1.users.id, { onDelete: "set null" }),
    provider: (0, pg_core_1.text)("provider").notNull(),
    requestType: (0, pg_core_1.text)("request_type").notNull(),
    prompt: (0, pg_core_1.text)("prompt").notNull(),
    response: (0, pg_core_1.text)("response").notNull(),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
});
