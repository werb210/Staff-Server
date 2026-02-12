type LogMeta = Record<string, unknown>;
type LogLevel = "info" | "warn" | "error";

const isProduction = process.env.NODE_ENV === "production";

function emit(level: LogLevel, message: string, meta: LogMeta = {}): void {
  const timestamp = new Date().toISOString();

  if (isProduction) {
    process.stdout.write(
      `${JSON.stringify({ timestamp, level, message, ...meta })}\n`
    );
    return;
  }

  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  const line = `[${timestamp}] ${level.toUpperCase()} ${message}${extra}`;

  if (level === "error") {
    process.stderr.write(`${line}\n`);
    return;
  }

  process.stdout.write(`${line}\n`);
}

export const logger = {
  info: (message: string, meta?: LogMeta): void => emit("info", message, meta),
  warn: (message: string, meta?: LogMeta): void => emit("warn", message, meta),
  error: (message: string, meta?: LogMeta): void => emit("error", message, meta),
};
