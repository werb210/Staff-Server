import { getRequestId, getRequestRoute } from "../middleware/requestContext";

type LogLevel = "info" | "warn" | "error";

type LogFields = {
  requestId?: string;
  route?: string;
  durationMs?: number | null;
  [key: string]: unknown;
};

function buildPayload(level: LogLevel, event: string, fields: LogFields = {}): Record<string, unknown> {
  const requestId = fields.requestId ?? getRequestId() ?? "unknown";
  const route = fields.route ?? getRequestRoute() ?? "unknown";
  const durationMs = fields.durationMs ?? null;
  const { requestId: _req, route: _route, durationMs: _duration, ...rest } = fields;

  return {
    timestamp: new Date().toISOString(),
    level,
    event,
    requestId,
    route,
    durationMs,
    ...rest,
  };
}

function writeLog(level: LogLevel, event: string, fields?: LogFields): void {
  const payload = buildPayload(level, event, fields);
  const output = JSON.stringify(payload);
  switch (level) {
    case "warn":
      console.warn(output);
      break;
    case "error":
      console.error(output);
      break;
    default:
      console.info(output);
      break;
  }
}

export function logInfo(event: string, fields?: LogFields): void {
  writeLog("info", event, fields);
}

export function logWarn(event: string, fields?: LogFields): void {
  writeLog("warn", event, fields);
}

export function logError(event: string, fields?: LogFields): void {
  writeLog("error", event, fields);
}
