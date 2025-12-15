import { sql } from "drizzle-orm";

import { config } from "../config/config";
import { db } from "../db";
import { users } from "../db/schema";
import { passwordService } from "./password.service";

const DEFAULT_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "BorealAdmin!2025";
const DEFAULT_STAFF_PASSWORD = process.env.SEED_STAFF_PASSWORD ?? "BorealStaff!2025";

type DefaultUserSpec = {
  email: string;
  firstName: string;
  lastName: string;
  role: "Admin" | "Staff";
  password: string;
};

async function upsertDefaultUser(user: DefaultUserSpec) {
  const passwordHash = await passwordService.hashPassword(user.password);

  await db
    .insert(users)
    .values({
      email: user.email.toLowerCase(),
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: "active",
      passwordHash,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: "active",
        passwordHash,
        updatedAt: sql`now()`,
      },
    });
}

export async function ensureDefaultUsers() {
  if (!config.JWT_SECRET && config.NODE_ENV === "production") {
    // In production, this code runs only after required envs are set via index.ts
    // but we keep a guard here to avoid running with an invalid configuration.
    throw new Error("JWT_SECRET is required before ensuring default users");
  }

  await upsertDefaultUser({
    email: "admin@boreal.financial",
    firstName: "System",
    lastName: "Admin",
    role: "Admin",
    password: DEFAULT_ADMIN_PASSWORD,
  });
  console.log("Ensured default admin user exists");

  await upsertDefaultUser({
    email: "staff@boreal.financial",
    firstName: "System",
    lastName: "Staff",
    role: "Staff",
    password: DEFAULT_STAFF_PASSWORD,
  });
  console.log("Ensured default staff user exists");
}
