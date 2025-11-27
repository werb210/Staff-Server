/* eslint-disable no-console */
export interface Logger {
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

function stamp(): string {
  return new Date().toISOString();
}

export function createLogger(scope: string): Logger {
  return {
    info(message: string, meta?: unknown) {
      console.log(`[${stamp()}][INFO][${scope}] ${message}`, meta ?? '');
    },
    warn(message: string, meta?: unknown) {
      console.warn(`[${stamp()}][WARN][${scope}] ${message}`, meta ?? '');
    },
    error(message: string, meta?: unknown) {
      console.error(`[${stamp()}][ERROR][${scope}] ${message}`, meta ?? '');
    },
  };
}
