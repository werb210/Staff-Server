import { pgTable, uuid, varchar, integer, timestamp } from "drizzle-orm/pg-core";

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),

  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),

  businessName: varchar("business_name", { length: 200 }).notNull(),
  businessLegalName: varchar("business_legal_name", { length: 200 }).notNull(),
  industry: varchar("industry", { length: 200 }).notNull(),
  businessLocation: varchar("business_location", { length: 200 }).notNull(),
  yearsInBusiness: integer("years_in_business").notNull(),

  amountRequested: integer("amount_requested").notNull(),
  avgMonthlyRevenue: integer("avg_monthly_revenue").notNull(),
  revenueLast12m: integer("revenue_last12m").notNull(),
  arBalance: integer("ar_balance").notNull(),
  apBalance: integer("ap_balance").notNull(),
  collateralValue: integer("collateral_value").notNull(),

  fundsPurpose: varchar("funds_purpose", { length: 500 }),

  status: varchar("status", { length: 50 }).notNull(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
