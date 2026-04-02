"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponseSchema = exports.ApiErrorSchema = exports.ApiSuccessSchema = void 0;
const zod_1 = require("zod");
exports.ApiSuccessSchema = zod_1.z.object({
  status: zod_1.z.literal("ok"),
  data: zod_1.z.any(),
  rid: zod_1.z.string().optional(),
});
exports.ApiErrorSchema = zod_1.z.object({
  status: zod_1.z.literal("error"),
  error: zod_1.z.string(),
  rid: zod_1.z.string().optional(),
});
exports.ApiResponseSchema = zod_1.z.union([exports.ApiSuccessSchema, exports.ApiErrorSchema]);
