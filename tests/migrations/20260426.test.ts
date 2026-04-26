import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("20260426 migration pgcrypto exception handling", () => {
  it("uses WHEN OTHERS and does not use insufficient_privilege", () => {
    const migrationPath = path.resolve(process.cwd(), "migrations/20260426_companies_contacts_partners.sql");
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toContain("EXCEPTION WHEN OTHERS THEN");
    expect(sql).not.toContain("WHEN insufficient_privilege");
  });
});
