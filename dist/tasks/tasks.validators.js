"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTaskSchema = exports.createTaskSchema = void 0;
const zod_1 = require("zod");
exports.createTaskSchema = zod_1.z.object({
    assignedToUserId: zod_1.z.string().uuid().optional(),
    applicationId: zod_1.z.string().uuid().optional(),
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().default(""),
    dueDate: zod_1.z.string().datetime().optional(),
});
exports.updateTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
    dueDate: zod_1.z.string().datetime().optional().nullable(),
    status: zod_1.z.enum(["open", "completed", "cancelled"]).optional(),
});
