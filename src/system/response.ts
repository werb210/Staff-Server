function toErrorCode(error: unknown): string {
  if (typeof error === "string" && error.trim().length > 0) {
    return error.trim();
  }

  if (error && typeof error === "object") {
    const payload = error as { code?: unknown; message?: unknown; error?: unknown };

    if (typeof payload.code === "string" && payload.code.trim().length > 0) {
      return payload.code.trim();
    }

    if (typeof payload.message === "string" && payload.message.trim().length > 0) {
      return payload.message.trim().toUpperCase().replace(/\s+/g, "_");
    }

    if (typeof payload.error === "string" && payload.error.trim().length > 0) {
      return payload.error.trim();
    }
  }

  return "UNKNOWN_ERROR";
}

export function ok(data: unknown, rid?: string) {
  return { status: "ok" as const, data, rid };
}

export function fail(error: unknown, rid?: string) {
  return {
    status: "error" as const,
    error: toErrorCode(error),
    rid,
  };
}
