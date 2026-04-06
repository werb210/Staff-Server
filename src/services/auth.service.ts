import jwt from 'jsonwebtoken';
import { redis } from '../lib/redis';

const OTP_PREFIX = 'otp:';

export async function storeOtp(phone: string, code: string) {
  await redis.set(`${OTP_PREFIX}${phone}`, code, 'EX', 300);
}

export async function verifyOtp(phone: string, code: string) {
  const stored = await redis.get(`${OTP_PREFIX}${phone}`);
  return stored === code;
}

export function issueToken(payload: any) {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  });
}
