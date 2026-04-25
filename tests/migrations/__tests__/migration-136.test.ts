import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("migration 136 — crm activities and o365", () => {
  const sql = readFileSync(
    join(process.cwd(), "migrations", "136_crm_activities_and_o365.sql"),
    "utf8",
  );

  it("creates all CRM activity tables", () => {
    for (const table of [
      "crm_notes",
      "crm_tasks",
      "crm_meetings",
      "crm_call_log",
      "crm_email_log",
      "shared_mailbox_settings",
    ]) {
      expect(sql).toMatch(new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+${table}`, "i"));
    }
  });

  it("is idempotent for key alterations", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS");
    expect(sql).toContain("CREATE INDEX IF NOT EXISTS");
  });

  it("adds companies.types_of_financing and contacts.lifecycle_stage", () => {
    expect(sql).toContain("ALTER TABLE companies ADD COLUMN IF NOT EXISTS types_of_financing TEXT[]");
    expect(sql).toContain("ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT");
  });
});
