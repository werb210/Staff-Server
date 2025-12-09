import { index, jsonb, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const applicationStatusEnum = pgEnum("application_status", [
  "new",
  "requires_docs",
  "startup_pipeline",
  "review",
  "lender_selection",
  "accepted",
  "declined",
]);

export const productCategoryEnum = pgEnum("product_category", [
  "working_capital",
  "term_loan",
  "line_of_credit",
  "invoice_factoring",
  "equipment_financing",
  "purchase_order",
  "startup",
]);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: applicationStatusEnum("status").default("new").notNull(),
    productCategory: productCategoryEnum("product_category").notNull(),
    kycData: jsonb("kyc_data").default({}).notNull(),
    businessData: jsonb("business_data").default({}).notNull(),
    applicantData: jsonb("applicant_data").default({}).notNull(),
    productSelection: jsonb("product_selection").default({}).notNull(),
    signatureData: jsonb("signature_data").default({}).notNull(),
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("applications_status_idx").on(table.status),
    categoryIdx: index("applications_category_idx").on(table.productCategory),
  }),
);
