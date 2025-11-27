import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import express = require('express');
import { prisma } from '../db/prisma';
import { env, optionalNumber } from '../utils/env';
import { createLogger } from '../utils/logger';

const logger = createLogger('auth-service');

const accessMinutes = optionalNumber(env.ACCESS_TOKEN_TTL_MINUTES, 15);
const refreshDays = optionalNumber(env.REFRESH_TOKEN_TTL_DAYS, 30);

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

interface JwtPayload {
  sub: string;
  role: string;
  email: string;
  sessionId: string;
}

function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: `${accessMinutes}m`,
    issuer: env.JWT_ISSUER || 'staff-server',
  });
}

function decodeRefreshToken(token: string): { sessionId: string; secret: string } | null {
  const [sessionId, secret] = token.split(':');
  if (!sessionId || !secret) {
    return null;
  }
  return { sessionId, secret };
}

async function persistSession(userId: string, secret: string, ip?: string, userAgent?: string): Promise<{ token: string; expiresAt: Date; sessionId: string }> {
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);
  const tokenHash = await bcrypt.hash(secret, 10);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      tokenHash,
      type: 'REFRESH',
      ip,
      userAgent,
      expiresAt,
    },
  });

  return { token: `${sessionId}:${secret}`, expiresAt, sessionId };
}

export async function login(email: string, password: string, ip?: string, userAgent?: string): Promise<{ tokens: TokenResponse; user: { id: string; email: string; role: string; name: string | null } }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    const err = new Error('Invalid credentials');
    (err as Error & { status?: number }).status = 401;
    throw err;
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    const err = new Error('Invalid credentials');
    (err as Error & { status?: number }).status = 401;
    throw err;
  }

  if (!user.isActive) {
    const err = new Error('Account is disabled');
    (err as Error & { status?: number }).status = 403;
    throw err;
  }

  const sessionSecret = randomUUID().replace(/-/g, '');
  const { token: refreshToken, expiresAt, sessionId } = await persistSession(user.id, sessionSecret, ip, userAgent);
  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email, sessionId });

  return {
    user: { id: user.id, email: user.email, role: user.role, name: user.name },
    tokens: { accessToken, refreshToken, expiresAt },
  };
}

export async function refresh(refreshToken: string): Promise<TokenResponse> {
  const decoded = decodeRefreshToken(refreshToken);
  if (!decoded) {
    const err = new Error('Refresh token malformed');
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const session = await prisma.session.findUnique({ where: { id: decoded.sessionId } });
  if (!session || session.type !== 'REFRESH' || session.expiresAt < new Date()) {
    const err = new Error('Refresh token invalid or expired');
    (err as Error & { status?: number }).status = 401;
    throw err;
  }

  const matches = await bcrypt.compare(decoded.secret, session.tokenHash);
  if (!matches) {
    const err = new Error('Refresh token mismatch');
    (err as Error & { status?: number }).status = 401;
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    const err = new Error('User not found for session');
    (err as Error & { status?: number }).status = 404;
    throw err;
  }

  const newSecret = randomUUID().replace(/-/g, '');
  const { token, expiresAt, sessionId } = await persistSession(user.id, newSecret, session.ip, session.userAgent);
  await prisma.session.delete({ where: { id: session.id } });

  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email, sessionId });
  return { accessToken, refreshToken: token, expiresAt };
}

export async function logout(refreshToken: string): Promise<void> {
  const decoded = decodeRefreshToken(refreshToken);
  if (!decoded) {
    return;
  }
  await prisma.session.deleteMany({ where: { id: decoded.sessionId } });
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return;
  }
  const secret = randomUUID().replace(/-/g, '');
  const tokenHash = await bcrypt.hash(secret, 10);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      tokenHash,
      type: 'RESET',
      expiresAt,
    },
  });

  logger.info('Password reset token created', { userId: user.id });
  // In production, deliver via email/SMS provider.
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const decoded = decodeRefreshToken(token) || { sessionId: '', secret: token };
  const session = await prisma.session.findFirst({
    where: {
      type: 'RESET',
      ...(decoded.sessionId ? { id: decoded.sessionId } : {}),
    },
  });
  if (!session || session.expiresAt < new Date()) {
    const err = new Error('Reset token invalid or expired');
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const matches = await bcrypt.compare(decoded.secret, session.tokenHash);
  if (!matches) {
    const err = new Error('Reset token invalid');
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: session.userId }, data: { passwordHash: hashed, passwordUpdatedAt: new Date() } });
  await prisma.session.deleteMany({ where: { userId: session.userId, type: 'RESET' } });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET, { issuer: env.JWT_ISSUER || 'staff-server' }) as JwtPayload;
}

export async function authenticateRequest(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const token = header.replace('Bearer ', '');
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    (req as express.Request & { user?: typeof user; sessionId?: string }).user = user;
    (req as express.Request & { user?: typeof user; sessionId?: string }).sessionId = payload.sessionId;
    next();
  } catch (error) {
    logger.error('Authentication failed', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}

export async function verifyOtp(userId: string, code: string): Promise<boolean> {
  const otpRecord = await prisma.otpCode.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
  if (!otpRecord || otpRecord.expiresAt < new Date()) {
    return false;
  }
  return bcrypt.compare(code, otpRecord.codeHash);
}
