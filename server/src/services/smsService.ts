import bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { Twilio } from 'twilio';
import { prisma } from '../db/prisma';
import { env } from '../utils/env';
import { createLogger } from '../utils/logger';

const logger = createLogger('sms-service');
const client = new Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

export interface OtpResult {
  to: string;
  expiresAt: Date;
}

export async function sendOtp(userId: string, phoneNumber: string): Promise<OtpResult> {
  const code = randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const codeHash = await bcrypt.hash(code, 10);

  await prisma.otpCode.create({
    data: {
      userId,
      codeHash,
      expiresAt,
    },
  });

  try {
    await client.messages.create({
      to: phoneNumber,
      from: env.TWILIO_FROM_NUMBER,
      body: `Your verification code is ${code}`,
    });
  } catch (error) {
    logger.error('Failed to send OTP', normalizeTwilioError(error));
    throw error;
  }

  return { to: phoneNumber, expiresAt };
}

export async function verifyOtp(userId: string, code: string): Promise<boolean> {
  const record = await prisma.otpCode.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
  if (!record || record.expiresAt < new Date()) {
    return false;
  }
  const valid = await bcrypt.compare(code, record.codeHash);
  if (valid) {
    await prisma.otpCode.deleteMany({ where: { userId } });
  }
  return valid;
}

function normalizeTwilioError(error: unknown): Record<string, unknown> {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const typed = error as { code?: unknown; message?: unknown };
    return { code: typed.code, message: typed.message };
  }
  return { message: String(error) };
}
