"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateChecksum = calculateChecksum;
exports.verifyDocumentIntegrity = verifyDocumentIntegrity;
const crypto_1 = require("crypto");
function calculateChecksum(buffer) {
    return (0, crypto_1.createHash)("sha256").update(buffer).digest("hex");
}
function verifyDocumentIntegrity(buffer, expectedChecksum) {
    const actual = calculateChecksum(buffer);
    return { isValid: actual === expectedChecksum, actual, expected: expectedChecksum };
}
