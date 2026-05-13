// BF_SERVER_BLOCK_v216_APPLICATION_DETAIL_BI_FIELDS_v1
// Regression: GET /api/applications/:id must return the BI
// handoff columns when set, and null when not.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const routesPath = resolve(__dirname, "..", "applications.routes.ts");
const src = readFileSync(routesPath, "utf8");

describe("BF_SERVER_BLOCK_v216_APPLICATION_DETAIL_BI_FIELDS_v1", () => {
  it("SELECT on GET /api/applications/:id includes a.bi_application_id", () => {
    // The change touches the SELECT in router.get('/:id', ...).
    // We locate that block by anchor and assert the column list
    // contains all three BI handoff columns.
    const idx = src.indexOf("router.get('/:id'");
    expect(idx).toBeGreaterThan(0);
    const window = src.slice(idx, idx + 2000);
    expect(window).toMatch(/a\.bi_application_id/);
    expect(window).toMatch(/a\.bi_public_id/);
    expect(window).toMatch(/a\.bi_completion_url/);
  });

  it("v216 block marker is present in the file", () => {
    expect(src).toMatch(/BF_SERVER_BLOCK_v216_APPLICATION_DETAIL_BI_FIELDS_v1/);
  });
});
