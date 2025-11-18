// server/src/utils/logger.ts

type LogMethod = (...args: unknown[]) => void;

type Logger = {
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
};

function timestamp(): string {
  return new Date().toISOString();
}

export const logger: Logger = {
  info: (...args) => console.log("[INFO]", timestamp(), ...args),
  warn: (...args) => console.warn("[WARN]", timestamp(), ...args),
  error: (...args) => console.error("[ERROR]", timestamp(), ...args),
};

export default logger;
