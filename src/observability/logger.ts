import pino from "pino";
import { fetchRequestId } from "./requestContext";

const SENSITIVE_FIELD_PATTERN = /(email|phone|ssn|password|token|secret|address)/i;

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry));
  }

  if (value && typeof value === "object") {
    return sanitizeObject(value as Record<string, unknown>);
  }

  return value;
}

function sanitizeObject(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (SENSITIVE_FIELD_PATTERN.test(key)) {
        return [key, "[REDACTED]"];
      }

      return [key, sanitizeValue(value)];
    }),
  );
}

const base = pino({
  level: process.env.LOG_LEVEL ?? "info",
});

export const logger = {
  info: (msg: string, extra: Record<string, unknown> = {}) => {
    base.info({ ...sanitizeObject(extra), requestId: fetchRequestId() }, msg);
  },
  warn: (msg: string, extra: Record<string, unknown> = {}) => {
    base.warn({ ...sanitizeObject(extra), requestId: fetchRequestId() }, msg);
  },
  error: (msg: string, extra: Record<string, unknown> = {}) => {
    base.error({ ...sanitizeObject(extra), requestId: fetchRequestId() }, msg);
  },
};

export const logInfo = (message: string, meta: Record<string, unknown> = {}) => logger.info(message, meta);
export const logWarn = (message: string, meta: Record<string, unknown> = {}) => logger.warn(message, meta);
export const logError = (message: string, meta: Record<string, unknown> = {}) => logger.error(message, meta);
