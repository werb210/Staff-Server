import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCircuitBreaker,
  resetCircuitBreakers,
} from "../circuitBreaker";

describe("circuit breaker", () => {
  beforeEach(() => {
    resetCircuitBreakers();
  });

  it("opens on repeated failures", () => {
    const breaker = getCircuitBreaker("test", {
      failureThreshold: 2,
      cooldownMs: 1_000,
    });

    breaker.recordFailure();
    breaker.recordFailure();

    expect(breaker.getSnapshot().state).toBe("OPEN");
  });

  it("blocks requests while open", () => {
    const breaker = getCircuitBreaker("test-open", {
      failureThreshold: 1,
      cooldownMs: 1_000,
    });

    breaker.recordFailure();

    expect(breaker.canRequest()).toBe(false);
  });

  it("closes after a successful half-open probe", () => {
    vi.useFakeTimers();
    const breaker = getCircuitBreaker("test-half-open", {
      failureThreshold: 1,
      cooldownMs: 1_000,
    });

    breaker.recordFailure();
    expect(breaker.canRequest()).toBe(false);

    vi.advanceTimersByTime(1_000);
    expect(breaker.canRequest()).toBe(true);
    breaker.recordSuccess();
    expect(breaker.getSnapshot().state).toBe("CLOSED");
    vi.useRealTimers();
  });
});
