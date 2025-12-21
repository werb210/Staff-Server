import { createHash } from "crypto";
export function calculateChecksum(buffer) {
    return createHash("sha256").update(buffer).digest("hex");
}
export function verifyDocumentIntegrity(buffer, expectedChecksum) {
    const actual = calculateChecksum(buffer);
    return { isValid: actual === expectedChecksum, actual, expected: expectedChecksum };
}
