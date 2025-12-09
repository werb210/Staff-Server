import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies";
import { contacts } from "./contacts";
import { deals } from "./deals";
import { lenderProducts } from "./lenderProducts";

export const applicationStatusEnum = pgEnum("application_status", [
  "draft",
  "submitted",
  "in_review",
  "approved",
  "rejected",
]);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "set null" }),
    lenderProductId: uuid("lender_product_id").references(() => lenderProducts.id, { onDelete: "set null" }),
    status: applicationStatusEnum("status").default("draft").notNull(),
    currentStep: integer("current_step").default(1).notNull(),
    kycAnswers: jsonb("kyc_answers").default({}).notNull(),
    productSelections: jsonb("product_selections").default({}).notNull(),
    applicantProfile: jsonb("applicant_profile").default({}).notNull(),
    businessProfile: jsonb("business_profile").default({}).notNull(),
    requestedAmount: integer("requested_amount"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index("applications_company_idx").on(table.companyId),
    statusIdx: index("applications_status_idx").on(table.status),
  }),
);
