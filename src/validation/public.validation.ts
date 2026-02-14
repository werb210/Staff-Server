import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

const HTML_TAG_REGEX = /<[^>]*>/g;

export function sanitizePlainText(value: string): string {
  return value.replace(HTML_TAG_REGEX, " ").replace(/\s+/g, " ").trim();
}

export const sanitizedString = (max: number, min = 1) => z.string()
  .transform((value) => sanitizePlainText(value))
  .pipe(z.string().min(min).max(max));

export const sanitizedEmail = z.string()
  .transform((value) => sanitizePlainText(value).toLowerCase())
  .pipe(z.string().email().max(254));

export const sanitizedPhone = z.string()
  .transform((value) => sanitizePlainText(value))
  .refine((value) => {
    const parsed = parsePhoneNumberFromString(value, "US");
    return Boolean(parsed?.isValid());
  }, "Invalid phone number")
  .transform((value) => {
    const parsed = parsePhoneNumberFromString(value, "US");
    return parsed?.number ?? value;
  });

export const sessionIdSchema = z.string().uuid();
