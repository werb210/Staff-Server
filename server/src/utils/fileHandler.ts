import { logDebug, logInfo } from "./logger.js";

/**
 * Writes a temporary file to disk (stubbed) and returns the generated file path.
 */
export async function saveTemporaryFile(buffer: Buffer, filename: string): Promise<string> {
  logInfo("saveTemporaryFile invoked");
  logDebug("saveTemporaryFile payload", { filename, size: buffer.length });
  return `/tmp/${Date.now()}-${filename}`;
}

/**
 * Deletes a previously saved temporary file (stubbed success response).
 */
export async function deleteTemporaryFile(path: string): Promise<boolean> {
  logInfo("deleteTemporaryFile invoked");
  logDebug("deleteTemporaryFile payload", { path });
  return true;
}

/**
 * Streams a file from storage as an async generator of buffers.
 */
export async function streamFileFromStorage(path: string): Promise<AsyncGenerator<Buffer>> {
  logInfo("streamFileFromStorage invoked");
  logDebug("streamFileFromStorage payload", { path });
  async function* generator(): AsyncGenerator<Buffer> {
    console.log("[fileHandler] internal generator invoked");
    yield Buffer.from(`stub-content-for-${path}`);
  }
  return generator();
}
