import { pool } from "../db";
import { ROLES } from "../auth/roles";
import { runMigrations } from "../migrations";
import { logInfo } from "../observability/logger";

export const SEEDED_ADMIN_PHONE = "+15878881837";
export const SEEDED_ADMIN_ID = "00000000-0000-0000-0000-000000000099";
export const SEEDED_ADMIN_EMAIL = "seeded-admin@boreal.financial";
export const SEEDED_ADMIN2_PHONE = "+1-780-264-8467";
export const SEEDED_ADMIN2_ID = "00000000-0000-0000-0000-000000000100";
export const SEEDED_ADMIN2_EMAIL = "seeded-admin-2@boreal.financial";
export const SEEDED_LENDER_ID = "00000000-0000-0000-0000-000000000200";
export const SEEDED_LENDER_PRODUCT_TERM_ID = "00000000-0000-0000-0000-000000000201";
export const SEEDED_LENDER_PRODUCT_LOC_ID = "00000000-0000-0000-0000-000000000202";

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

export async function seedBaselineLenders(): Promise<void> {
  const { rows: tableRows } = await pool.query<{
    lenders: string | null;
    lender_products: string | null;
  }>(
    "select to_regclass('public.lenders') as lenders, to_regclass('public.lender_products') as lender_products"
  );
  const lendersTable = tableRows[0]?.lenders ?? null;
  const lenderProductsTable = tableRows[0]?.lender_products ?? null;
  if (!lendersTable || !lenderProductsTable) {
    logInfo("baseline_lenders_seed_skipped", {
      reason: "tables_missing",
      lendersTableExists: Boolean(lendersTable),
      lenderProductsTableExists: Boolean(lenderProductsTable),
    });
    return;
  }

  const { rows } = await pool.query<{ count: number }>(
    "select count(*)::int as count from lenders"
  );
  if ((rows[0]?.count ?? 0) > 0) {
    return;
  }

  await pool.query(
    `insert into lenders
     (id, name, active, phone, website, description, country, created_at)
     values ($1, $2, true, $3, $4, $5, $6, now())`,
    [
      SEEDED_LENDER_ID,
      "Atlas Capital",
      "+1-555-0100",
      "https://atlascapital.example.com",
      "Seeded lender for staff flow validation.",
      "US",
    ]
  );

  await pool.query(
    `insert into lender_products
     (id, lender_id, name, description, active, created_at, updated_at)
     values
     ($1, $2, $3, $4, true, now(), now()),
     ($5, $2, $6, $7, true, now(), now())`,
    [
      SEEDED_LENDER_PRODUCT_TERM_ID,
      SEEDED_LENDER_ID,
      "Term Loan",
      "Term loan product (category: term).",
      SEEDED_LENDER_PRODUCT_LOC_ID,
      "Line of Credit",
      "Revolving line of credit product (category: loc).",
    ]
  );
}

export async function seedDatabase(): Promise<void> {
  await runMigrations();
  await seedAdminUser();
  await seedSecondAdminUser();
  await seedBaselineLenders();
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
