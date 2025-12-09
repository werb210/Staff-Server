import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import {
  applicationStageEnum,
  applicationStatusEnum,
  productTypeEnum,
} from "./enums.js";
import { users } from "./users.js";
import { lenderProducts } from "./products.js";

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  referenceCode: text("reference_code").notNull().unique(),
  applicantUserId: uuid("applicant_user_id").references(() => users.id, { onDelete: "set null" }),
  assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, { onDelete: "set null" }),
  lenderProductId: uuid("lender_product_id").references(() => lenderProducts.id, { onDelete: "set null" }),
  status: applicationStatusEnum("status").notNull().default("draft"),
  stage: applicationStageEnum("stage").notNull().default("intake"),
  requestedAmount: numeric("requested_amount", { precision: 14, scale: 2 }),
  desiredProductType: productTypeEnum("desired_product_type"),
  currentStep: text("current_step"),
  source: text("source"),
  submittedAt: timestamp("submitted_at"),
  decisionAt: timestamp("decision_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
