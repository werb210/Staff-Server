import { date, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { ownerRoleEnum } from "./enums.js";
import { applications } from "./applications.js";

export const applicantOwners = pgTable("applicant_owners", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull(),
  ownerRole: ownerRoleEnum("owner_role").notNull().default("primary"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  ssnLast4: text("ssn_last4"),
  ownershipPercentage: numeric("ownership_percentage", { precision: 5, scale: 2 }).notNull(),
  dateOfBirth: date("date_of_birth"),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
