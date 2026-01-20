import type { Request } from "express";
import { z } from "zod";
import { ROLES, type Role } from "../auth/roles";

const roleValues = Object.values(ROLES) as [Role, ...Role[]];
const roleSchema = z.enum(roleValues);
const phoneSchema = z
  .string()
  .min(1, "Phone is required")
  .regex(/^\+?[1-9]\d{1,14}$/, "Phone must be in E.164 format");

export const startOtpSchema = z
  .object({
    phone: phoneSchema,
  })
  .strict();

export const verifyOtpSchema = z
  .object({
    phone: phoneSchema,
    code: z.string().length(6, "Code must be 6 characters"),
  })
  .strict();

const authUserBaseSchema = z
  .object({
    id: z.string(),
    role: roleSchema,
  })
  .strict();

const authUserWithContactSchema = authUserBaseSchema
  .extend({
    phone: z.string().optional(),
    email: z.string().optional(),
  })
  .strict();

export const startOtpResponseSchema = z
  .object({
    sent: z.boolean(),
  })
  .strict();

export const verifyOtpResponseSchema = z.union([
  z.undefined(),
  z
    .object({
      accessToken: z.string(),
      refreshToken: z.string().optional(),
      user: authUserWithContactSchema,
    })
    .strict(),
]);

export const authMeSchema = z
  .object({
    ok: z.boolean(),
    data: z
      .object({
        userId: z.string(),
        role: roleSchema,
        phone: z.string().nullable().optional(),
        capabilities: z.array(z.string()),
      })
      .strict(),
    error: z.null(),
    requestId: z.string(),
  })
  .strict();

export function validateStartOtp(req: Request) {
  return startOtpSchema.safeParse(req.body);
}

export function validateVerifyOtp(req: Request) {
  return verifyOtpSchema.safeParse(req.body);
}

export function validateAuthMe(res: unknown) {
  return authMeSchema.safeParse(res);
}
