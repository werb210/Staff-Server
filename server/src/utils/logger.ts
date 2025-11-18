// server/src/utils/logger.ts
// BLOCK 32 — Minimal, production-safe logger

type Level = "info" | "warn" | "error" | "debug";

const LOG_LEVELS: Record<Level, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const CURRENT_LEVEL =
  process.env.LOG_LEVEL && LOG_LEVELS[process.env.LOG_LEVEL as Level] !== undefined
    ? LOG_LEVELS[process.env.LOG_LEVEL as Level]
    : LOG_LEVELS.info;

const serializeMeta = (meta: unknown) => {
  if (meta instanceof Error) {
    const { name, message, stack, ...rest } = meta;
    return { name, message, stack, ...rest };
  }

  return meta;
};

function log(level: Level, message: string, meta?: unknown) {
  if (LOG_LEVELS[level] > CURRENT_LEVEL) return;

  const time = new Date().toISOString();
  const base = `[${time}] [${level.toUpperCase()}] ${message}`;
  const consoleMethod = typeof console[level] === "function" ? console[level] : console.log;

  if (meta !== undefined) {
    const safeMeta = serializeMeta(meta);

    try {
      consoleMethod(`${base} ${JSON.stringify(safeMeta, null, 2)}`);
    } catch (err) {
      consoleMethod(base, safeMeta);
      console.debug("Logger meta serialization failed", serializeMeta(err));
    }
  } else {
    consoleMethod(base);
  }
}

export const logger = {
  info: (msg: string, meta?: unknown) => log("info", msg, meta),
  warn: (msg: string, meta?: unknown) => log("warn", msg, meta),
  error: (msg: string, meta?: unknown) => log("error", msg, meta),
  debug: (msg: string, meta?: unknown) => log("debug", msg, meta),
};

// END OF FILE
