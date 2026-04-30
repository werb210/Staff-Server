import { describe, it, expect, vi } from "vitest";
import { readReadinessSnapshot, maybeStartCreditSummaryAndSign, maybeBuildAndSendPackage, progressSubmission } from "../../../src/services/submission/orchestrator";
function fakePool(rowsByQuery: Record<string, unknown[]>): any {
  return { query: vi.fn(async (sql: string) => { for (const key of Object.keys(rowsByQuery)) if (sql.includes(key)) return { rows: rowsByQuery[key] }; return { rows: [] }; }) };
}
describe("orchestrator readiness", () => {
  it("returns blocked when a required category has no accepted doc", async () => {
    const pool = fakePool({ "document_requirements": [{ blocked: true }], "application_tasks": [{ open_count: "0" }], "application_lender_selections": [{ finalized_at: "2026-01-01" }], "FROM applications WHERE id::text": [{ credit_summary_submitted_at: null, signed_at: null }] });
    const snap = await readReadinessSnapshot({ pool, applicationId: "a1" });
    expect(snap.allDocsAccepted).toBe(false);
  });
});
