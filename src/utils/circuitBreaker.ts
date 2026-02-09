export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export type CircuitBreakerOptions = {
  failureThreshold: number;
  cooldownMs: number;
};

type CircuitBreakerSnapshot = {
  state: CircuitBreakerState;
  failures: number;
  openedAt: number | null;
};

const breakers = new Map<string, CircuitBreaker>();

class CircuitBreaker {
  private failures = 0;
  private state: CircuitBreakerState = "CLOSED";
  private openedAt: number | null = null;

  constructor(private readonly options: CircuitBreakerOptions) {}

  getSnapshot(): CircuitBreakerSnapshot {
    return {
      state: this.state,
      failures: this.failures,
      openedAt: this.openedAt,
    };
  }

  canRequest(now = Date.now()): boolean {
    if (this.state === "OPEN") {
      if (this.openedAt !== null && now - this.openedAt >= this.options.cooldownMs) {
        this.state = "HALF_OPEN";
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = "CLOSED";
    this.openedAt = null;
  }

  recordFailure(now = Date.now()): void {
    if (this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.openedAt = now;
      this.failures = this.options.failureThreshold;
      return;
    }
    this.failures += 1;
    if (this.failures >= this.options.failureThreshold) {
      this.state = "OPEN";
      this.openedAt = now;
    }
  }
}

export function getCircuitBreaker(
  name: string,
  options: CircuitBreakerOptions
): CircuitBreaker {
  const existing = breakers.get(name);
  if (existing) {
    return existing;
  }
  const breaker = new CircuitBreaker(options);
  breakers.set(name, breaker);
  return breaker;
}

export function resetCircuitBreakers(): void {
  breakers.clear();
}
