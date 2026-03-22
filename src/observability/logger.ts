export const logInfo = (...args: any[]) => console.log('[INFO]', ...args);
export const logError = (...args: any[]) => console.error('[ERROR]', ...args);
export const logWarn = (...args: any[]) => console.warn('[WARN]', ...args);
export const logDebug = (...args: any[]) => console.debug('[DEBUG]', ...args);

export const logger = {
  info: logInfo,
  error: logError,
  warn: logWarn,
  debug: logDebug
};
