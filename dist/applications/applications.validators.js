"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ownerUpdateSchema = exports.declineSchema = exports.statusChangeSchema = exports.updateApplicationSchema = exports.createApplicationSchema = exports.signatureSchema = exports.ownerSchema = exports.productSelectionSchema = exports.applicantDataSchema = exports.businessDataSchema = exports.kycSchema = exports.productCategoryValues = exports.statusEnumValues = void 0;
const zod_1 = require("zod");
const schema_1 = require("../db/schema");
exports.statusEnumValues = schema_1.applicationStatusEnum.enumValues;
exports.productCategoryValues = schema_1.productCategoryEnum.enumValues;
const addressSchema = zod_1.z.object({
    address: zod_1.z.string().min(1),
    city: zod_1.z.string().min(1),
    state: zod_1.z.string().min(1),
    zip: zod_1.z.string().min(2),
});
exports.kycSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().min(5),
});
exports.businessDataSchema = zod_1.z
    .object({
    legalName: zod_1.z.string().min(1),
    ein: zod_1.z.string().min(4),
    industry: zod_1.z.string().min(2),
    yearsInBusiness: zod_1.z.number().int().nonnegative(),
    address: addressSchema,
    revenue: zod_1.z.number().nonnegative().optional(),
    employees: zod_1.z.number().int().nonnegative().optional(),
})
    .passthrough();
exports.applicantDataSchema = zod_1.z
    .object({
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    title: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().min(5),
    address: addressSchema,
})
    .passthrough();
exports.productSelectionSchema = zod_1.z
    .object({
    requestedAmount: zod_1.z.number().positive(),
    useOfFunds: zod_1.z.string().min(3),
    preferences: zod_1.z.record(zod_1.z.any()).optional(),
})
    .passthrough();
exports.ownerSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().min(5),
    address: zod_1.z.string().min(1),
    city: zod_1.z.string().min(1),
    state: zod_1.z.string().min(2),
    zip: zod_1.z.string().min(2),
    dob: zod_1.z.string().min(4),
    ssn: zod_1.z.string().min(4),
    ownershipPercentage: zod_1.z.number().int().min(0).max(100),
});
exports.signatureSchema = zod_1.z.object({
    signedBy: zod_1.z.string().min(1),
    signedAt: zod_1.z.string().optional(),
    ipAddress: zod_1.z.string().min(3).optional(),
});
exports.createApplicationSchema = zod_1.z.object({
    productCategory: zod_1.z.enum(exports.productCategoryValues),
    kycData: exports.kycSchema,
    businessData: exports.businessDataSchema,
    applicantData: exports.applicantDataSchema,
    productSelection: exports.productSelectionSchema,
    signatureData: exports.signatureSchema.optional(),
    assignedTo: zod_1.z.string().uuid().optional(),
});
exports.updateApplicationSchema = zod_1.z
    .object({
    productCategory: zod_1.z.enum(exports.productCategoryValues).optional(),
    kycData: exports.kycSchema.optional(),
    businessData: exports.businessDataSchema.optional(),
    applicantData: exports.applicantDataSchema.optional(),
    productSelection: exports.productSelectionSchema.optional(),
    signatureData: exports.signatureSchema.optional(),
    assignedTo: zod_1.z.string().uuid().optional(),
})
    .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
});
exports.statusChangeSchema = zod_1.z.object({
    status: zod_1.z.enum(exports.statusEnumValues),
});
exports.declineSchema = zod_1.z.object({
    reason: zod_1.z.string().min(1).optional(),
});
exports.ownerUpdateSchema = exports.ownerSchema.partial().refine((data) => Object.keys(data).length > 0, {
    message: "At least one owner field must be provided",
});
