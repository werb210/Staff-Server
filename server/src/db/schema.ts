// server/src/db/schema.ts
import { pgTable, varchar, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const applications = pgTable("applications", {
  id: varchar("id", { length: 50 }).primaryKey(),

  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),

  businessName: text("business_name"),
  businessLegalName: text("business_legal_name"),
  industry: text("industry"),
  businessLocation: text("business_location"),
  yearsInBusiness: numeric("years_in_business"),

  amountRequested: numeric("amount_requested"),
  avgMonthlyRevenue: numeric("avg_monthly_revenue"),
  revenueLast12m: numeric("revenue_last_12m"),
  arBalance: numeric("ar_balance"),
  apBalance: numeric("ap_balance"),
  collateralValue: numeric("collateral_value"),

  fundsPurpose: text("funds_purpose"),

  status: text("status"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
