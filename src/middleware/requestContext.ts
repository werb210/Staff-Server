type RequestContext = {
  requestId: string;
};

export function getRequestId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function getRequestContext(): RequestContext {
  return { requestId: getRequestId() };
}

export function getRequestRoute(): string {
  return '';
}

export function getRequestIdempotencyKeyHash(): string {
  return '';
}

export function getRequestDbProcessIds(): string[] {
  return [];
}

export async function runWithRequestContext<T>(
  fn: () => Promise<T>
): Promise<T> {
  return await fn();
}
