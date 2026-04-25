import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

describe("migration 136", () => {
  it("does not invoke CREATE EXTENSION pgcrypto", () => {
    const sql = readFileSync(
      "migrations/136_crm_activities_and_o365.sql",
      "utf8",
    );
    expect(/create\s+extension[^;]*pgcrypto/i.test(sql)).toBe(false);
  });
});
