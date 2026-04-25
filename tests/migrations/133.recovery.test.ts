import fs from "node:fs";
import path from "node:path";

import { newDb } from "pg-mem";
import { describe, expect, it } from "vitest";

function applyUpTo133(): ReturnType<typeof newDb> {
  const db = newDb();
  db.public.registerFunction({
    name: "gen_random_uuid",
    returns: "uuid" as any,
    implementation: () => "11111111-1111-4111-8111-111111111111",
  });

  db.public.none("CREATE TABLE users (id uuid PRIMARY KEY);");
  db.public.none("CREATE TABLE contacts (id uuid PRIMARY KEY);");
  db.public.none("CREATE TABLE lender_products (id uuid PRIMARY KEY, status text);");
  db.public.none("CREATE TABLE lenders (id uuid PRIMARY KEY, submission_method text, active boolean, status text);");

  const migrationPath = path.resolve(process.cwd(), "migrations/133_recovery_columns_v2.sql");
  const sql = fs.readFileSync(migrationPath, "utf8");

  // pg-mem does not support PL/pgSQL DO blocks. Execute equivalent statements
  // directly for this migration test, then run the remainder of SQL.
  const withoutDoBlocks = sql
    .replace(/DO \$\$[\s\S]*?END \$\$;/g, "")
    .trim();

  db.public.none("UPDATE lender_products SET status = 'active' WHERE status IS NULL;");
  db.public.none("ALTER TABLE lender_products ALTER COLUMN status SET DEFAULT 'active';");
  db.public.none(withoutDoBlocks);
  return db;
}

describe("133_recovery_columns_v2 migration", () => {
  it("creates/repairs recovery columns and constraints", () => {
    const db = applyUpTo133();

    const companiesColumns = db.public.many(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'companies'
    `).map((r: any) => r.column_name);
    expect(companiesColumns).toEqual(expect.arrayContaining([
      "id", "name", "website", "city", "province", "country", "industry", "annual_revenue",
      "number_of_employees", "silo", "owner_id", "created_at", "updated_at",
    ]));

    const contactColumns = db.public.many(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'contacts'
    `).map((r: any) => r.column_name);
    expect(contactColumns).toEqual(expect.arrayContaining([
      "job_title", "lead_status", "tags", "owner_id", "company_id",
    ]));

    db.public.none("INSERT INTO lender_products (id) VALUES ('22222222-2222-4222-8222-222222222222')");
    const lenderProduct = db.public.one("SELECT status FROM lender_products WHERE id = '22222222-2222-4222-8222-222222222222'") as { status: string | null };
    expect((lenderProduct.status ?? "").toLowerCase()).toBe("active");

    expect(() => {
      db.public.none("INSERT INTO lenders (id, submission_method) VALUES ('33333333-3333-4333-8333-333333333333', 'PORTAL')");
    }).toThrow();

    const droppedConstraint = db.public.many(`
      SELECT conname
      FROM pg_constraint
      WHERE conname = 'lenders_active_status_check'
    `);
    expect(droppedConstraint).toHaveLength(0);
  });
});
