import { AsyncLocalStorage } from "async_hooks";

type RequestContext = {
  requestId: string;
  route?: string;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(
  context: RequestContext,
  fn: () => T
): T {
  return storage.run(context, fn);
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

export function getRequestRoute(): string | undefined {
  return storage.getStore()?.route;
}
