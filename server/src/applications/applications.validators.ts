import { z } from "zod";
import { applicationStatusEnum, productCategoryEnum } from "../db/schema";

export const statusEnumValues = applicationStatusEnum.enumValues;
export const productCategoryValues = productCategoryEnum.enumValues;

const addressSchema = z.object({
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(2),
});

export const kycSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(5),
});

export const businessDataSchema = z
  .object({
    legalName: z.string().min(1),
    ein: z.string().min(4),
    industry: z.string().min(2),
    yearsInBusiness: z.number().int().nonnegative(),
    address: addressSchema,
    revenue: z.number().nonnegative().optional(),
    employees: z.number().int().nonnegative().optional(),
  })
  .passthrough();

export const applicantDataSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    title: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(5),
    address: addressSchema,
  })
  .passthrough();

export const productSelectionSchema = z
  .object({
    requestedAmount: z.number().positive(),
    useOfFunds: z.string().min(3),
    preferences: z.record(z.any()).optional(),
  })
  .passthrough();

export const ownerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(5),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(2),
  zip: z.string().min(2),
  dob: z.string().min(4),
  ssn: z.string().min(4),
  ownershipPercentage: z.number().int().min(0).max(100),
});

export const signatureSchema = z.object({
  signedBy: z.string().min(1),
  signedAt: z.string().optional(),
  ipAddress: z.string().min(3).optional(),
});

export const createApplicationSchema = z.object({
  productCategory: z.enum(productCategoryValues),
  kycData: kycSchema,
  businessData: businessDataSchema,
  applicantData: applicantDataSchema,
  productSelection: productSelectionSchema,
  signatureData: signatureSchema.optional(),
  assignedTo: z.string().uuid().optional(),
});

export const updateApplicationSchema = z
  .object({
    productCategory: z.enum(productCategoryValues).optional(),
    kycData: kycSchema.optional(),
    businessData: businessDataSchema.optional(),
    applicantData: applicantDataSchema.optional(),
    productSelection: productSelectionSchema.optional(),
    signatureData: signatureSchema.optional(),
    assignedTo: z.string().uuid().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const statusChangeSchema = z.object({
  status: z.enum(statusEnumValues),
});

export const declineSchema = z.object({
  reason: z.string().min(1).optional(),
});

export const ownerUpdateSchema = ownerSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: "At least one owner field must be provided",
});
