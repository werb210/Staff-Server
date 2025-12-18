import bcrypt from "bcrypt";
import { eq, sql } from "drizzle-orm";

import { closeDatabase, db } from "../db";
import { users } from "../db/schema";

async function seedAdmin() {
  const email = "todd.w@boreal.financial";
  const password = "1Sucker1!";
  const password_hash = await bcrypt.hash(password, 12);

  const existing = await db.select().from(users).where(eq(users.email, email));

  if (existing.length === 0) {
    await db.insert(users).values({
      email,
      password_hash,
      first_name: "Todd",
      last_name: "W",
      role: "Admin",
      status: "active",
      is_active: true,
    });
    console.log("✅ Admin user CREATED");
  } else {
    await db
      .update(users)
      .set({
        password_hash,
        first_name: "Todd",
        last_name: "W",
        role: "Admin",
        status: "active",
        is_active: true,
        updated_at: sql`now()`,
      })
      .where(eq(users.email, email));
    console.log("♻️ Admin password RESET");
  }
}

let exitCode = 0;

seedAdmin()
  .catch((error) => {
    console.error("Failed to seed admin user", error);
    exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase().catch(() => undefined);
    process.exit(exitCode);
  });
