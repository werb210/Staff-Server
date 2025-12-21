"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrResultsQuerySchema = exports.OcrReprocessSchema = void 0;
const zod_1 = require("zod");
const ocr_types_1 = require("./ocr.types");
exports.OcrReprocessSchema = ocr_types_1.OcrRequestSchema;
exports.OcrResultsQuerySchema = zod_1.z.object({
    applicationId: zod_1.z.string().uuid(),
});
