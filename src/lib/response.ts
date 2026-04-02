export function ok(data: any, rid?: string) {
  return {
    status: "ok",
    data,
    rid,
  };
}

export function error(message: string, rid?: string) {
  return {
    status: "error",
    error: message,
    rid,
  };
}
