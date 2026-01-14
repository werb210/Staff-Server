import { pool } from "../db";
import { ROLES } from "../auth/roles";
import { runMigrations } from "../migrations";

export const SEEDED_ADMIN_PHONE = "+15878881837";
export const SEEDED_ADMIN_ID = "00000000-0000-0000-0000-000000000099";
export const SEEDED_ADMIN_EMAIL = "seeded-admin@boreal.financial";
export const SEEDED_ADMIN2_PHONE = "+1-780-264-8467";
export const SEEDED_ADMIN2_ID = "00000000-0000-0000-0000-000000000100";
export const SEEDED_ADMIN2_EMAIL = "seeded-admin-2@boreal.financial";

export async function seedAdminUser(): Promise<{ id: string; phoneNumber: string }> {
  const phoneNumber = SEEDED_ADMIN_PHONE;
  await pool.query(
    `insert into users (
        id,
        email,
        phone_number,
        phone,
        role,
        active,
        is_active,
        disabled,
        locked_until,
        phone_verified
      )
     values ($1, $2, $3, $4, $5, true, true, false, null, true)
     on conflict (phone_number) do update
       set email = excluded.email,
           phone = excluded.phone,
           role = excluded.role,
           active = excluded.active,
           is_active = excluded.is_active,
           disabled = excluded.disabled,
           locked_until = excluded.locked_until,
           phone_verified = excluded.phone_verified`,
    [SEEDED_ADMIN_ID, SEEDED_ADMIN_EMAIL, phoneNumber, phoneNumber, ROLES.ADMIN]
  );
  return { id: SEEDED_ADMIN_ID, phoneNumber };
}

export async function seedSecondAdminUser(): Promise<{
  id: string;
  phoneNumber: string;
}> {
  const phoneNumber = SEEDED_ADMIN2_PHONE;
  await pool.query(
    `insert into users (
        id,
        email,
        phone_number,
        phone,
        role,
        active,
        is_active,
        disabled,
        locked_until,
        phone_verified
      )
     values ($1, $2, $3, $4, $5, true, true, false, null, true)
     on conflict (phone_number) do update
       set email = excluded.email,
           phone = excluded.phone,
           role = excluded.role,
           active = excluded.active,
           is_active = excluded.is_active,
           disabled = excluded.disabled,
           locked_until = excluded.locked_until,
           phone_verified = excluded.phone_verified`,
    [SEEDED_ADMIN2_ID, SEEDED_ADMIN2_EMAIL, phoneNumber, phoneNumber, ROLES.ADMIN]
  );
  return { id: SEEDED_ADMIN2_ID, phoneNumber };
}

export async function seedDatabase(): Promise<void> {
  await runMigrations();
  await seedAdminUser();
  await seedSecondAdminUser();
}

if (require.main === module) {
  seedDatabase()
    .then(async () => {
      await pool.end();
    })
    .catch(async (err) => {
      console.error(err);
      await pool.end();
      process.exit(1);
    });
}
