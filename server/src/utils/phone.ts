import { z } from "zod";

const phoneRegex = /^\+?[0-9 .()\-]{7,20}$/;

export const phoneSchema = z
  .string()
  .trim()
  .regex(phoneRegex, "Invalid phone number format");

export type PhoneNumber = z.infer<typeof phoneSchema>;

export const normalizePhoneNumber = (value: string): string =>
  value.replace(/[^0-9+]/g, "");

export const isValidPhoneNumber = (value: string): boolean =>
  phoneSchema.safeParse(value).success;
