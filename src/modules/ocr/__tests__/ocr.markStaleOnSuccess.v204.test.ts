// BF_SERVER_BLOCK_v204_OCR_SUCCESS_MARK_LENDER_MATCHES_STALE_v1
// Contract test: static analysis confirming the OCR success path calls
// markLenderMatchesStale before the ocr_job_succeeded log. We intentionally
// don't mock the DB pool (ocr.service.ts has no DI seam for it); we instead
// verify the wiring is present and structurally correct. If a future refactor
// reorganizes the success block, this test fails loudly so the wiring isn't
// silently lost.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const svcPath = resolve(__dirname, "..", "ocr.service.ts");
const src = readFileSync(svcPath, "utf8");

describe("v204 OCR success flips lender-match cache stale", () => {
  it("imports markLenderMatchesStale from lenderMatchCache", () => {
    expect(src).toMatch(
      /import\s*\{\s*markLenderMatchesStale\s*\}\s*from\s*["']\.\.\/\.\.\/services\/lenderMatchCache\.js["']/,
    );
  });

  it("calls markLenderMatchesStale with job.application_id", () => {
    expect(src).toContain("markLenderMatchesStale(job.application_id)");
  });

  it("calls it BEFORE the ocr_job_succeeded log (so a thrown log doesn't skip the flip)", () => {
    const callIdx = src.indexOf("markLenderMatchesStale(job.application_id)");
    const logIdx = src.indexOf('logInfo("ocr_job_succeeded"');
    expect(callIdx).toBeGreaterThan(-1);
    expect(logIdx).toBeGreaterThan(-1);
    expect(callIdx).toBeLessThan(logIdx);
  });

  it("uses fire-and-forget pattern with error logging (not awaited, not thrown)", () => {
    // Must use `void` prefix and a .catch handler — matches the v198 portal.ts
    // caller's pattern. A bare `await` would block OCR completion on a cache
    // write that is best-effort.
    expect(src).toMatch(
      /void\s+markLenderMatchesStale\(job\.application_id\)\.catch\(/,
    );
  });

  it("the catch handler logs ocr_mark_lender_matches_stale_failed (not silent)", () => {
    expect(src).toContain("ocr_mark_lender_matches_stale_failed");
  });
});
