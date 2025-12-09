import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications";

export const applicantOwners = pgTable("applicant_owners", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
  dob: text("dob").notNull(),
  ssn: text("ssn").notNull(),
  ownershipPercentage: integer("ownership_percentage").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
