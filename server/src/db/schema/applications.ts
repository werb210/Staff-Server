// server/src/db/schema/applications.ts
import { pgTable, varchar, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const applications = pgTable("applications", {
  id: varchar("id").primaryKey(),

  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone").notNull(),

  businessName: varchar("business_name").notNull(),
  businessLegalName: varchar("business_legal_name").notNull(),
  industry: varchar("industry").notNull(),
  businessLocation: varchar("business_location").notNull(),
  yearsInBusiness: numeric("years_in_business").notNull(),

  amountRequested: numeric("amount_requested").notNull(),
  avgMonthlyRevenue: numeric("avg_monthly_revenue").notNull(),
  revenueLast12m: numeric("revenue_last_12m").notNull(),
  arBalance: numeric("ar_balance").notNull(),
  apBalance: numeric("ap_balance").notNull(),
  collateralValue: numeric("collateral_value").notNull(),

  fundsPurpose: text("funds_purpose").notNull(),

  status: varchar("status").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
