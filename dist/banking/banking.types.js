"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankingReprocessSchema = void 0;
const zod_1 = require("zod");
exports.BankingReprocessSchema = zod_1.z.object({
    applicationId: zod_1.z.string().uuid(),
    documentVersionIds: zod_1.z.array(zod_1.z.string().uuid()).min(1),
});
