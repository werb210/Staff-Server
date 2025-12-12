import { Client } from "pg";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL missing");
}

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log("Seeding users...");

  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);

  // Resolve enum values safely (case-insensitive) so we don't care if the enum is Admin/ADMIN/admin etc.
  const roleSql = (roleLower: string) => `
    (
      select e.enumlabel::user_role
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'user_role'
        and lower(e.enumlabel) = '${roleLower}'
      limit 1
    )
  `;

  await client.query(
    `
    insert into users (id, email, password_hash, role, created_at)
    values
      (gen_random_uuid(), 'admin@boreal.financial', $1, ${roleSql("admin")}, now()),
      (gen_random_uuid(), 'staff@boreal.financial', $1, ${roleSql("staff")}, now())
    on conflict (email) do nothing
  `,
    [passwordHash],
  );

  console.log("Users seeded");
  await client.end();
}

seed()
  .then(() => {
    console.log("Seed complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
