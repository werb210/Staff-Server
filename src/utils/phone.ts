export function normalizePhone(phone: string): string {
  if (typeof phone !== "string") {
    throw new Error("Invalid phone number format");
  }

  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  throw new Error("Invalid phone number format");
}

export function tryNormalizePhone(phone: unknown): string | null {
  if (typeof phone !== "string") {
    return null;
  }

  try {
    return normalizePhone(phone);
  } catch {
    return null;
  }
}

export function normalizePhoneNumber(phone: string): string {
  return normalizePhone(phone);
}

export function normalizeOtpPhone(phone: unknown): string | null {
  return tryNormalizePhone(phone);
}
