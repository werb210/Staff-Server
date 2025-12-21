"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicantOwners = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const applications_1 = require("./applications");
exports.applicantOwners = (0, pg_core_1.pgTable)("applicant_owners", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    applicationId: (0, pg_core_1.uuid)("application_id")
        .references(() => applications_1.applications.id, { onDelete: "cascade" })
        .notNull(),
    firstName: (0, pg_core_1.text)("first_name").notNull(),
    lastName: (0, pg_core_1.text)("last_name").notNull(),
    email: (0, pg_core_1.text)("email").notNull(),
    phone: (0, pg_core_1.text)("phone").notNull(),
    address: (0, pg_core_1.text)("address").notNull(),
    city: (0, pg_core_1.text)("city").notNull(),
    state: (0, pg_core_1.text)("state").notNull(),
    zip: (0, pg_core_1.text)("zip").notNull(),
    dob: (0, pg_core_1.text)("dob").notNull(),
    ssn: (0, pg_core_1.text)("ssn").notNull(),
    ownershipPercentage: (0, pg_core_1.integer)("ownership_percentage").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
