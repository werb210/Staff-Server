import bcrypt from "bcrypt";

import { closeDatabase, db } from "../db";
import { users } from "../db/schema";

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set");
  }

  console.log("🔥 Deleting ALL users");
  await db.delete(users);

  console.log("🔐 Creating ADMIN user");
  const password_hash = await bcrypt.hash(password, 12);

  await db.insert(users).values({
    email,
    password_hash,
    first_name: "Admin",
    last_name: "User",
    role: "Admin",
    status: "active",
    is_active: true,
  });

  console.log("✅ Admin seeded:", email);
}

let exitCode = 0;

seedAdmin()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase().catch(() => undefined);
    process.exit(exitCode);
  });
