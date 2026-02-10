import { beforeEach, describe, expect, it } from "vitest";
import { getCircuitBreaker, resetCircuitBreakers } from "../../../utils/circuitBreaker";

describe("circuit breaker utility", () => {
  beforeEach(() => {
    resetCircuitBreakers();
  });

  it("opens after repeated failures and closes on success", () => {
    const breaker = getCircuitBreaker("test-breaker", {
      failureThreshold: 2,
      cooldownMs: 10_000,
    });
    expect(breaker.canRequest()).toBe(true);
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.canRequest()).toBe(false);
    breaker.recordSuccess();
    expect(breaker.canRequest()).toBe(true);
  });
});
