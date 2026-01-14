export function normalizePhoneNumber(phone: unknown): string | null {
  if (!phone || typeof phone !== "string") {
    return null;
  }
  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    return null;
  }
  const normalizedDigits = digits.length === 10 ? `1${digits}` : digits;
  if (
    normalizedDigits.length < 11 ||
    normalizedDigits.length > 15 ||
    normalizedDigits.startsWith("0")
  ) {
    return null;
  }
  return `+${normalizedDigits}`;
}
