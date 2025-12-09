import { integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { businessEntityTypeEnum } from "./enums.js";
import { applications } from "./applications.js";

export const businessInfo = pgTable("business_info", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  legalName: text("legal_name").notNull(),
  dbaName: text("dba_name"),
  entityType: businessEntityTypeEnum("entity_type").notNull(),
  ein: text("ein"),
  industry: text("industry"),
  naicsCode: text("naics_code"),
  website: text("website"),
  phone: text("phone"),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  yearEstablished: integer("year_established"),
  annualRevenue: numeric("annual_revenue", { precision: 14, scale: 2 }),
  averageMonthlyRevenue: numeric("average_monthly_revenue", { precision: 14, scale: 2 }),
  employeeCount: integer("employee_count"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
