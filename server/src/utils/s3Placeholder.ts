import { logInfo } from "./logger.js";

export const uploadToS3Placeholder = async (key: string): Promise<string> => {
  logInfo("S3 placeholder invoked", { key });
  return `s3://placeholder-bucket/${key}`;
};
