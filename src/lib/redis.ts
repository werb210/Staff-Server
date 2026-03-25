import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");

export async function setOtp(phone: string, code: string) {
  await redis.set(`otp:${phone}`, code, "EX", 300);
}

export async function fetchOtp(phone: string) {
  return redis.get(`otp:${phone}`);
}

export async function deleteOtp(phone: string) {
  await redis.del(`otp:${phone}`);
}
