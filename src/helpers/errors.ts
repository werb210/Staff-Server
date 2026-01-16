export type HttpishError = {
  status: number;
  message?: string;
  code?: string;
};

export function isHttpishError(error: unknown): error is HttpishError {
  if (!error || typeof error !== "object") {
    return false;
  }
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" && Number.isFinite(status);
}

export function getStatus(error: unknown): number {
  if (isHttpishError(error)) {
    if (error.status >= 400 && error.status < 600) {
      return error.status;
    }
  }
  return 500;
}
