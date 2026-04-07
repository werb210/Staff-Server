import { deps } from "./deps";

export function trackRequest() {
  deps.metrics.requests = (deps.metrics.requests + 1) % Number.MAX_SAFE_INTEGER;
}

export function trackError() {
  deps.metrics.errors = (deps.metrics.errors + 1) % Number.MAX_SAFE_INTEGER;
}

export function getMetrics() {
  return {
    requests: deps.metrics.requests,
    errors: deps.metrics.errors,
  };
}

export function resetMetrics() {
  deps.metrics.requests = 0;
  deps.metrics.errors = 0;
}

export const incReq = trackRequest;
export const incErr = trackError;
export const metrics = getMetrics;
