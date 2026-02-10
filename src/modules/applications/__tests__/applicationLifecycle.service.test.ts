import { describe, expect, it } from "vitest";
import {
  ApplicationStage,
  assertPipelineTransition,
  isTerminalApplicationStatus,
} from "../applicationLifecycle.service";

describe("application lifecycle guards", () => {
  it("returns no change when reapplying the same stage", () => {
    const result = assertPipelineTransition({
      currentStage: ApplicationStage.RECEIVED,
      nextStage: ApplicationStage.RECEIVED,
    });
    expect(result.shouldTransition).toBe(false);
  });

  it("blocks invalid backward transitions", () => {
    expect(() =>
      assertPipelineTransition({
        currentStage: ApplicationStage.IN_REVIEW,
        nextStage: ApplicationStage.RECEIVED,
      })
    ).toThrow("Invalid pipeline transition.");
  });

  it("treats terminal statuses as immutable", () => {
    expect(
      isTerminalApplicationStatus("completed")
    ).toBe(true);
    expect(() =>
      assertPipelineTransition({
        currentStage: ApplicationStage.RECEIVED,
        nextStage: ApplicationStage.IN_REVIEW,
        status: "withdrawn",
      })
    ).toThrow("Application is in a terminal state.");
  });
});
