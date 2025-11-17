// server/src/db/schema/applications.ts
import { pgTable, text, varchar, timestamp, numeric, uuid } from "drizzle-orm/pg-core";

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Applicant info
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),

  // Business info
  businessName: varchar("business_name", { length: 255 }),
  businessLegalName: varchar("business_legal_name", { length: 255 }),
  industry: varchar("industry", { length: 255 }),
  businessLocation: varchar("business_location", { length: 255 }),
  yearsInBusiness: numeric("years_in_business"),

  // Financial profile
  amountRequested: numeric("amount_requested"),
  avgMonthlyRevenue: numeric("avg_monthly_revenue"),
  revenueLast12m: numeric("revenue_last_12m"),
  arBalance: numeric("ar_balance"),
  apBalance: numeric("ap_balance"),
  collateralValue: numeric("collateral_value"),

  // Purpose
  fundsPurpose: text("funds_purpose"),

  // Status
  status: varchar("status", { length: 50 })
    .$type<
      | "submitted"
      | "in_review"
      | "requires_docs"
      | "docs_received"
      | "lender_review"
      | "approved"
      | "declined"
    >(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
