import { redis } from "../lib/redis";

const OTP_TTL = 300; // 5 minutes

function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.length === 10) p = `1${p}`;
  if (!p.startsWith("1")) throw new Error("Invalid phone");
  return `+${p}`;
}

export async function storeOtp(phone: string, code: string): Promise<void> {
  const normalized = normalizePhone(phone);
  const key = `otp:${normalized}`;

  console.log("[OTP STORE]", key, code);

  await redis.set(key, code, "EX", OTP_TTL);

  const ttl = await redis.ttl(key);
  console.log("[OTP TTL AFTER SET]", ttl);
}

export async function verifyOtp(phone: string, code: string): Promise<
  | { ok: true }
  | { ok: false; error: "expired_code" | "invalid_code"; message: string }
> {
  const normalized = normalizePhone(phone);
  const key = `otp:${normalized}`;

  const stored = await redis.get(key);

  console.log("[OTP VERIFY]", key, "stored:", stored, "incoming:", code);

  if (!stored) {
    return { ok: false, error: "expired_code", message: "OTP session expired" };
  }

  if (stored !== code) {
    return { ok: false, error: "invalid_code", message: "Invalid code" };
  }

  await redis.del(key);

  return { ok: true };
}
