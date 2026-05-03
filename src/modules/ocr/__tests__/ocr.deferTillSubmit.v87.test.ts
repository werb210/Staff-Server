// BF_SERVER_BLOCK_v87_OCR_DEFER_TILL_SUBMIT_v1
import { describe, expect, it } from "vitest";

// Pure assertion of the WHERE-clause predicate semantics.
function isEligibleForOcr(pipelineState: string | null | undefined): boolean {
  if (pipelineState === null || pipelineState === undefined) return false;
  const s = String(pipelineState);
  if (s === "" || s === "draft" || s === "Draft") return false;
  return true;
}

describe("v87 OCR worker defers pre-submit jobs", () => {
  it("draft applications do not run OCR", () => {
    expect(isEligibleForOcr("draft")).toBe(false);
    expect(isEligibleForOcr("Draft")).toBe(false);
    expect(isEligibleForOcr("")).toBe(false);
    expect(isEligibleForOcr(null)).toBe(false);
    expect(isEligibleForOcr(undefined)).toBe(false);
  });
  it("submitted applications are eligible for OCR", () => {
    expect(isEligibleForOcr("Received")).toBe(true);
    expect(isEligibleForOcr("Documents Required")).toBe(true);
    expect(isEligibleForOcr("In Review")).toBe(true);
    expect(isEligibleForOcr("Funded")).toBe(true);
  });
});
