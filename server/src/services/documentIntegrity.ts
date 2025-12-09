import { createHash } from "crypto";

export function calculateChecksum(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function verifyDocumentIntegrity(buffer: Buffer, expectedChecksum: string) {
  const actual = calculateChecksum(buffer);
  return { isValid: actual === expectedChecksum, actual, expected: expectedChecksum };
}
