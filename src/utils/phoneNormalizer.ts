export function normalizePhone(input: string): string {
  if (!input) return "";

  const raw = input.trim();
  if (!raw) return "";

  let digits = raw.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  if (raw.startsWith("+")) {
    return `+${digits}`;
  }

  return `+${digits}`;
}
