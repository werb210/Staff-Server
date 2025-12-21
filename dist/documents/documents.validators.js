"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentIntegrityEventCreate = exports.DocumentValidateSchema = exports.DocumentCompleteSchema = exports.DocumentCreateSchema = void 0;
const zod_1 = require("zod");
exports.DocumentCreateSchema = zod_1.z.object({
    applicationId: zod_1.z.string().uuid(),
    documentId: zod_1.z.string().uuid().optional(),
    companyId: zod_1.z.string().uuid().optional(),
    contactId: zod_1.z.string().uuid().optional(),
    fileName: zod_1.z.string().min(1),
    mimeType: zod_1.z.string().min(1),
});
exports.DocumentCompleteSchema = zod_1.z.object({
    documentId: zod_1.z.string().uuid(),
    blobKey: zod_1.z.string().min(1),
    checksumSha256: zod_1.z.string().min(1),
    sizeBytes: zod_1.z.number().int().nonnegative(),
    mimeType: zod_1.z.string().min(1),
    fileName: zod_1.z.string().min(1),
});
exports.DocumentValidateSchema = zod_1.z.object({
    checksumSha256: zod_1.z.string().min(1).optional(),
});
exports.DocumentIntegrityEventCreate = zod_1.z.object({
    documentId: zod_1.z.string().uuid(),
    eventType: zod_1.z.enum([
        "upload_started",
        "upload_completed",
        "checksum_verified",
        "missing_detected",
        "restored",
        "version_created",
        "required_doc_added",
        "required_doc_removed",
    ]),
    metadata: zod_1.z.record(zod_1.z.any()).default({}),
});
