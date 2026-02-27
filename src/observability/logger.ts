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
  const durationMs = fields.durationMs ?? 0;
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
  const env =
    typeof process !== "undefined" && process?.env
      ? process.env
      : ({} as Record<string, string | undefined>);

  if (env.NODE_ENV === "test" && env.TEST_LOGGING !== "true") {
    return;
  }
  try {
    const payload = buildPayload(level, event, fields);
    const output = JSON.stringify(payload);
    switch (level) {
      case "error":
        process.stderr.write(`${output}\n`);
        break;
      case "warn":
      default:
        process.stdout.write(`${output}\n`);
        break;
    }
  } catch {
    // Swallow logging errors to avoid crashing tests or runtime paths.
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
