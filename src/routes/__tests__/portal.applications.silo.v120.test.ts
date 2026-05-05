// BF_SERVER_BLOCK_v120_PORTAL_APPLICATIONS_SILO_FROM_RESOLVED_v1
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
describe("v120 portal /applications — silo + dual-shape fix", () => {
  const portalSrc = fs.readFileSync(
    path.resolve(__dirname, "../portal.ts"),
    "utf8"
  );
  it("contains the v120 sentinel", () => {
    expect(portalSrc).toContain(
      "BF_SERVER_BLOCK_v120_PORTAL_APPLICATIONS_SILO_FROM_RESOLVED_v1"
    );
  });
  it("falls back to getSilo(res) when no query silo is provided", () => {
    expect(portalSrc).toMatch(
      /getSilo[\s\S]{0,200}?from[\s\S]{0,200}?middleware\/silo/
    );
    expect(portalSrc).toMatch(
      /req\.query\.business_unit[\s\S]{0,80}?req\.query\.silo[\s\S]{0,80}?getSilo\(res\)/
    );
  });
  it("returns BOTH `applications` and `items` arrays in the response", () => {
    expect(portalSrc).toMatch(/applications:\s*cards/);
    expect(portalSrc).toMatch(/items:\s*cards/);
  });
  it("response cards include legacy snake_case AND modern camelCase fields", () => {
    expect(portalSrc).toMatch(/pipeline_state:\s*r\.stage/);
    expect(portalSrc).toMatch(/business_legal_name:\s*r\.business_name/);
    expect(portalSrc).toMatch(/requested_amount:\s*r\.requested_amount/);
    expect(portalSrc).toMatch(/created_at:\s*r\.last_activity_at/);
    expect(portalSrc).toMatch(/businessName:\s*r\.business_name/);
    expect(portalSrc).toMatch(/requestedAmount:\s*r\.requested_amount/);
    expect(portalSrc).toMatch(/lastActivityAt:\s*r\.last_activity_at/);
  });
});
