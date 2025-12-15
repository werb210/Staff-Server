import { Client } from "pg";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL missing");
}

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log("Fetching user_role enum values...");

  const enumRes = await client.query(`
    select enumlabel
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'user_role'
    order by e.enumsortorder
  `);

  if (enumRes.rows.length < 2) {
    throw new Error("user_role enum does not contain enough values");
  }

  const ADMIN_ROLE = enumRes.rows[0].enumlabel;
  const STAFF_ROLE = enumRes.rows[1].enumlabel;

  console.log("Using roles:", ADMIN_ROLE, STAFF_ROLE);

  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);

  await client.query(
    `
    insert into users (
      id,
      email,
      password_hash,
      first_name,
      last_name,
      role,
      status,
      created_at,
      updated_at
    )
    values
      (
        gen_random_uuid(),
        'admin@boreal.financial',
        $1,
        'System',
        'Admin',
        $2,
        'active',
        now(),
        now()
      ),
      (
        gen_random_uuid(),
        'staff@boreal.financial',
        $1,
        'System',
        'Staff',
        $3,
        'active',
        now(),
        now()
      )
    on conflict (email) do nothing
    `,
    [passwordHash, ADMIN_ROLE, STAFF_ROLE]
  );

  console.log("Users seeded successfully");

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
