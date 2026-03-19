import { redis } from "../lib/redis";

const TTL = 300;

function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.length === 10) p = "1" + p;
  if (!p.startsWith("1")) throw new Error("Invalid phone");
  return `+${p}`;
}

export async function sendOtp(phone: string) {
  const normalized = normalizePhone(phone);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const key = `otp:${normalized}`;

  console.log("[OTP STORE]", key, code);

  await redis.set(key, code, "EX", TTL);

  const ttl = await redis.ttl(key);
  console.log("[OTP TTL]", ttl);

  return code;
}

export async function storeOtp(phone: string, code: string) {
  const normalized = normalizePhone(phone);
  const key = `otp:${normalized}`;

  await redis.set(key, code, "EX", TTL);

  const ttl = await redis.ttl(key);
  console.log("[OTP STORE]", key, code, "ttl:", ttl);
}

export async function verifyOtp(phone: string, code: string) {
  const normalized = normalizePhone(phone);
  const key = `otp:${normalized}`;

  const stored = await redis.get(key);

  console.log("[OTP VERIFY]", key, "stored:", stored, "incoming:", code);

  if (!stored) {
    return { ok: false, error: "expired_code" };
  }

  if (stored !== code) {
    return { ok: false, error: "invalid_code" };
  }

  await redis.del(key);

  return { ok: true };
}
