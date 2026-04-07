export function ok(data: unknown, rid?: string) {
  return { status: "ok" as const, data, rid };
}

export function fail(error: unknown, rid?: string) {
  return {
    status: "error" as const,
    error: error instanceof Error ? error.message : String(error),
    rid,
  };
}

export function error(message: string, rid?: string) {
  return {
    status: "error" as const,
    error: message,
    rid,
  };
}


export function respondOk(res: any, data: unknown) {
  return res.status(200).json(ok(data, res?.getHeader?.("x-request-id") as string | undefined));
}
