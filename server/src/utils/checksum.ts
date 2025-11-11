import { createHash } from "crypto";

export const createChecksum = (content: string | Buffer): string =>
  createHash("sha256").update(content).digest("hex");
