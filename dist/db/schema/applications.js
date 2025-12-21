"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applications = exports.productCategoryEnum = exports.applicationStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
exports.applicationStatusEnum = (0, pg_core_1.pgEnum)("application_status", [
    "new",
    "requires_docs",
    "startup_pipeline",
    "review",
    "lender_selection",
    "accepted",
    "declined",
]);
exports.productCategoryEnum = (0, pg_core_1.pgEnum)("product_category", [
    "working_capital",
    "term_loan",
    "line_of_credit",
    "invoice_factoring",
    "equipment_financing",
    "purchase_order",
    "startup",
]);
exports.applications = (0, pg_core_1.pgTable)("applications", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    status: (0, exports.applicationStatusEnum)("status").default("new").notNull(),
    productCategory: (0, exports.productCategoryEnum)("product_category").notNull(),
    kycData: (0, pg_core_1.jsonb)("kyc_data").default({}).notNull(),
    businessData: (0, pg_core_1.jsonb)("business_data").default({}).notNull(),
    applicantData: (0, pg_core_1.jsonb)("applicant_data").default({}).notNull(),
    productSelection: (0, pg_core_1.jsonb)("product_selection").default({}).notNull(),
    signatureData: (0, pg_core_1.jsonb)("signature_data").default({}).notNull(),
    creditSummaryVersion: (0, pg_core_1.integer)("credit_summary_version").default(0).notNull(),
    assignedTo: (0, pg_core_1.uuid)("assigned_to").references(() => users_1.users.id, { onDelete: "set null" }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    statusIdx: (0, pg_core_1.index)("applications_status_idx").on(table.status),
    categoryIdx: (0, pg_core_1.index)("applications_category_idx").on(table.productCategory),
}));
