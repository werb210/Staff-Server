"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrRequestSchema = void 0;
const zod_1 = require("zod");
exports.OcrRequestSchema = zod_1.z.object({
    applicationId: zod_1.z.string().uuid(),
    documentId: zod_1.z.string().uuid(),
    documentVersionId: zod_1.z.string().uuid(),
    blobKey: zod_1.z.string().min(1),
});
