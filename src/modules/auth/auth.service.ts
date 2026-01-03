import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import {
  createPasswordReset,
  createUser,
  findAuthUserByEmail,
  findAuthUserById,
  findPasswordReset,
  findRefreshToken,
  markPasswordResetUsed,
  revokeRefreshToken,
  storeRefreshToken,
  updatePassword,
} from "./auth.repo";
import { getAccessTokenExpiresIn, getRefreshTokenExpiresIn } from "../../config";
import { AppError } from "../../middleware/errors";
import { recordAuditEvent } from "../audit/audit.service";
import { pool } from "../../db";

type TokenPayload = {
  userId: string;
  role: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function timingSafeTokenCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

function issueAccessToken(payload: TokenPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError("auth_misconfigured", "Auth is not configured.", 503);
  }
  const options: SignOptions = {
    expiresIn: getAccessTokenExpiresIn() as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, secret, options);
}

function issueRefreshToken(payload: TokenPayload): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new AppError("auth_misconfigured", "Auth is not configured.", 503);
  }
  const options: SignOptions = {
    expiresIn: getRefreshTokenExpiresIn() as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, secret, options);
}

export async function loginUser(
  email: string,
  password: string,
  ip?: string
): Promise<{
  user: { id: string; email: string; role: string };
  accessToken: string;
  refreshToken: string;
}> {
  const user = await findAuthUserByEmail(email);

  if (!user || !user.password_hash || !user.role || !user.email) {
    await recordAuditEvent({
      action: "login",
      entity: "session",
      entityId: user?.id ?? null,
      actorUserId: user?.id ?? null,
      ip,
      success: false,
    });
    throw new AppError("invalid_credentials", "Invalid email or password.", 401);
  }

  if (!user.active) {
    await recordAuditEvent({
      action: "login",
      entity: "session",
      entityId: user.id,
      actorUserId: user.id,
      ip,
      success: false,
    });
    throw new AppError("user_disabled", "User is disabled.", 403);
  }

  const ok = await bcrypt.compare(password, user.password_hash);

  if (!ok) {
    await recordAuditEvent({
      action: "login",
      entity: "session",
      entityId: user.id,
      actorUserId: user.id,
      ip,
      success: false,
    });
    throw new AppError("invalid_credentials", "Invalid email or password.", 401);
  }

  const payload = { userId: user.id, role: user.role };
  const accessToken = issueAccessToken(payload);
  const refreshToken = issueRefreshToken(payload);
  const tokenHash = hashToken(refreshToken);

  const refreshExpires = new Date();
  refreshExpires.setSeconds(
    refreshExpires.getSeconds() + msToSeconds(getRefreshTokenExpiresIn())
  );

  await storeRefreshToken({
    userId: user.id,
    tokenHash,
    expiresAt: refreshExpires,
  });

  await recordAuditEvent({
    action: "login",
    entity: "session",
    entityId: user.id,
    actorUserId: user.id,
    ip,
    success: true,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  };
}

export async function refreshSession(
  refreshToken: string,
  ip?: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new AppError("auth_misconfigured", "Auth is not configured.", 503);
  }

  const decoded = jwt.decode(refreshToken) as TokenPayload | null;
  const actorUserId = decoded?.userId ?? null;

  try {
    const payload = jwt.verify(refreshToken, secret) as TokenPayload;
    if (!payload.userId || !payload.role) {
      throw new AppError("invalid_token", "Invalid refresh token.", 401);
    }

    const tokenHash = hashToken(refreshToken);
    const record = await findRefreshToken(tokenHash);
    if (!record || record.revoked_at) {
      throw new AppError("invalid_token", "Invalid refresh token.", 401);
    }
    if (record.expires_at.getTime() < Date.now()) {
      throw new AppError("invalid_token", "Invalid refresh token.", 401);
    }

    const user = await findAuthUserById(payload.userId);
    if (!user || !user.active) {
      throw new AppError("invalid_token", "Invalid refresh token.", 401);
    }

    const newAccessToken = issueAccessToken({
      userId: user.id,
      role: user.role,
    });
    const newRefreshToken = issueRefreshToken({
      userId: user.id,
      role: user.role,
    });
    const newHash = hashToken(newRefreshToken);
    const refreshExpires = new Date();
    refreshExpires.setSeconds(
      refreshExpires.getSeconds() + msToSeconds(getRefreshTokenExpiresIn())
    );

    await revokeRefreshToken(tokenHash);
    await storeRefreshToken({
      userId: user.id,
      tokenHash: newHash,
      expiresAt: refreshExpires,
    });

    await recordAuditEvent({
      action: "token_refresh",
      entity: "session",
      entityId: user.id,
      actorUserId: user.id,
      ip,
      success: true,
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch (err) {
    await recordAuditEvent({
      action: "token_refresh",
      entity: "session",
      entityId: actorUserId,
      actorUserId,
      ip,
      success: false,
    });
    throw err;
  }
}

export async function logoutUser(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await revokeRefreshToken(tokenHash);
}

export async function createUserAccount(params: {
  email: string;
  password: string;
  role: string;
  actorUserId?: string | null;
  ip?: string;
}): Promise<{ id: string; email: string; role: string }> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const passwordHash = await bcrypt.hash(params.password, 12);
    const user = await createUser({
      email: params.email,
      passwordHash,
      role: params.role,
      client,
    });
    await client.query("commit");
    await recordAuditEvent({
      action: "user_create",
      entity: "user",
      entityId: user.id,
      actorUserId: params.actorUserId ?? null,
      ip: params.ip,
      success: true,
    });
    return { id: user.id, email: user.email, role: user.role };
  } catch (err) {
    await client.query("rollback");
    await recordAuditEvent({
      action: "user_create",
      entity: "user",
      entityId: null,
      actorUserId: params.actorUserId ?? null,
      ip: params.ip,
      success: false,
    });
    throw err;
  } finally {
    client.release();
  }
}

export async function changePassword(params: {
  userId: string;
  currentPassword: string;
  newPassword: string;
  ip?: string;
}): Promise<void> {
  const user = await findAuthUserById(params.userId);
  if (!user || !user.password_hash) {
    await recordAuditEvent({
      action: "password_change",
      entity: "user",
      entityId: params.userId,
      actorUserId: params.userId,
      ip: params.ip,
      success: false,
    });
    throw new AppError("invalid_credentials", "Invalid credentials.", 401);
  }
  const ok = await bcrypt.compare(params.currentPassword, user.password_hash);
  if (!ok) {
    await recordAuditEvent({
      action: "password_change",
      entity: "user",
      entityId: params.userId,
      actorUserId: params.userId,
      ip: params.ip,
      success: false,
    });
    throw new AppError("invalid_credentials", "Invalid credentials.", 401);
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    const passwordHash = await bcrypt.hash(params.newPassword, 12);
    await updatePassword(params.userId, passwordHash, client);
    await client.query("commit");
    await recordAuditEvent({
      action: "password_change",
      entity: "user",
      entityId: params.userId,
      actorUserId: params.userId,
      ip: params.ip,
      success: true,
    });
  } catch (err) {
    await client.query("rollback");
    await recordAuditEvent({
      action: "password_change",
      entity: "user",
      entityId: params.userId,
      actorUserId: params.userId,
      ip: params.ip,
      success: false,
    });
    throw err;
  } finally {
    client.release();
  }
}

export async function requestPasswordReset(params: {
  userId: string;
  ip?: string;
}): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await createPasswordReset({ userId: params.userId, tokenHash, expiresAt });
  return token;
}

export async function confirmPasswordReset(params: {
  token: string;
  newPassword: string;
  ip?: string;
}): Promise<void> {
  const tokenHash = hashToken(params.token);
  const record = await findPasswordReset(tokenHash);
  if (!record || record.used_at || record.expires_at.getTime() < Date.now()) {
    throw new AppError("invalid_token", "Invalid reset token.", 401);
  }

  if (!timingSafeTokenCompare(record.token_hash, tokenHash)) {
    throw new AppError("invalid_token", "Invalid reset token.", 401);
  }

  const passwordHash = await bcrypt.hash(params.newPassword, 12);
  await updatePassword(record.user_id, passwordHash);
  await markPasswordResetUsed(record.id);
  await recordAuditEvent({
    action: "password_change",
    entity: "user",
    entityId: record.user_id,
    actorUserId: record.user_id,
    ip: params.ip,
    success: true,
  });
}

function msToSeconds(value: string): number {
  if (value.endsWith("ms")) {
    return Math.floor(Number(value.replace("ms", "")) / 1000);
  }
  const unit = value.slice(-1);
  const amount = Number(value.slice(0, -1));
  if (Number.isNaN(amount)) {
    return 0;
  }
  switch (unit) {
    case "s":
      return amount;
    case "m":
      return amount * 60;
    case "h":
      return amount * 60 * 60;
    case "d":
      return amount * 60 * 60 * 24;
    default:
      return amount;
  }
}
