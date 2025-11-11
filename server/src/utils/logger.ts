import { inspect } from "util";

type LogLevel = "info" | "warn" | "error";

const formatMessage = (level: LogLevel, message: string, meta?: unknown): string => {
  const timestamp = new Date().toISOString();
  const metaString =
    meta === undefined || meta === null ? "" : ` ${inspect(meta, { depth: 5, breakLength: Infinity })}`;
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
};

export const logInfo = (message: string, meta?: unknown): void => {
  console.log(formatMessage("info", message, meta));
};

export const logWarn = (message: string, meta?: unknown): void => {
  console.warn(formatMessage("warn", message, meta));
};

export const logError = (message: string, meta?: unknown): void => {
  console.error(formatMessage("error", message, meta));
};
