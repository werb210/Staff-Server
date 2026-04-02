export function ok(data?: any, rid?: string) {
  return { status: "ok", ...(rid ? { rid } : {}), ...(data !== undefined ? { data } : {}) };
}

export function error(message: string, rid?: string) {
  return { status: "error", ...(rid ? { rid } : {}), error: message };
}
