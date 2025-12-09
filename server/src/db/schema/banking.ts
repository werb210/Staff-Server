import { sql } from "drizzle-orm";
import { integer, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { bankingAnalysisStatusEnum } from "./enums.js";
import { applications } from "./applications.js";

export const bankingAnalysis = pgTable("banking_analysis", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull(),
  institutionName: text("institution_name"),
  reportPeriodStart: timestamp("report_period_start"),
  reportPeriodEnd: timestamp("report_period_end"),
  averageDailyBalance: numeric("average_daily_balance", { precision: 14, scale: 2 }),
  totalDeposits: numeric("total_deposits", { precision: 14, scale: 2 }),
  totalWithdrawals: numeric("total_withdrawals", { precision: 14, scale: 2 }),
  nsfCount: integer("nsf_count"),
  riskScore: integer("risk_score"),
  status: bankingAnalysisStatusEnum("status").notNull().default("pending"),
  summary: text("summary"),
  metrics: jsonb("metrics").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
