import { z } from "zod";
import { isValidUuid } from "../utils/uuidValidator.js";
import { sanitizePhoneNumber, isE164PhoneNumber } from "../utils/phone.js";

const uuidSchema = z
  .string()
  .min(1)
  .refine((value: string) => isValidUuid(value), { message: "User identifier must be a valid UUID" });

/**
 * Schema describing a user within the platform.
 */
export const userSchema = z.object({
  id: uuidSchema,
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("A valid email is required"),
  phone: z
    .string()
    .transform((value: string) => sanitizePhoneNumber(value))
    .refine((value: string) => isE164PhoneNumber(value), {
      message: "Phone number must be in E.164 format"
    }),
  role: z.enum(["applicant", "loan_officer", "admin"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

/**
 * Schema for creating or updating a user record.
 */
export const upsertUserSchema = userSchema.partial({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type User = z.infer<typeof userSchema>;
export type UpsertUserInput = z.infer<typeof upsertUserSchema>;

export function parseUser(input: unknown): User {
  return userSchema.parse(input);
}

export function parseUpsertUserInput(input: unknown): UpsertUserInput {
  return upsertUserSchema.parse(input);
}
