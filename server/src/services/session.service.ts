import { randomUUID } from "crypto";
import { AuthenticatedUser, TokenPair, TokenPayload } from "../auth/auth.types";
import { jwtService } from "./jwt.service";
import { passwordService } from "./password.service";

interface SessionRecord {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
}

const sessions = new Map<string, SessionRecord>();

function buildPayload(user: AuthenticatedUser, sessionId: string): TokenPayload {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId,
  };
}

async function persistSession(user: AuthenticatedUser, refreshToken: string, sessionId: string) {
  const decoded = jwtService.decode(refreshToken);
  const refreshTokenHash = await passwordService.hashToken(refreshToken);
  const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date();
  sessions.set(sessionId, {
    id: sessionId,
    userId: user.id,
    refreshTokenHash,
    expiresAt,
  });
  return expiresAt;
}

export const sessionService = {
  async createSession(user: AuthenticatedUser): Promise<TokenPair> {
    const sessionId = randomUUID();
    const payload = buildPayload(user, sessionId);
    const accessToken = jwtService.signAccessToken(payload);
    const refreshToken = jwtService.signRefreshToken(payload);
    const refreshExpiresAt = await persistSession(user, refreshToken, sessionId);
    const decodedAccess = jwtService.decode(accessToken);
    const accessExpiresAt = decodedAccess?.exp ? new Date(decodedAccess.exp * 1000) : new Date();
    return { accessToken, refreshToken, accessExpiresAt, refreshExpiresAt, sessionId };
  },

  async refreshSession(user: AuthenticatedUser, refreshToken: string): Promise<TokenPair> {
    const payload = jwtService.verifyRefreshToken(refreshToken);
    const session = sessions.get(payload.sessionId);
    if (!session || session.userId !== user.id) {
      throw new Error("Session not found");
    }
    if (session.expiresAt.getTime() < Date.now()) {
      sessions.delete(payload.sessionId);
      throw new Error("Session expired");
    }
    const isValid = await passwordService.verifyToken(refreshToken, session.refreshTokenHash);
    if (!isValid) {
      sessions.delete(payload.sessionId);
      throw new Error("Invalid refresh token");
    }
    const newPayload = buildPayload(user, payload.sessionId);
    const accessToken = jwtService.signAccessToken(newPayload);
    const newRefreshToken = jwtService.signRefreshToken(newPayload);
    const refreshExpiresAt = await persistSession(user, newRefreshToken, payload.sessionId);
    const decodedAccess = jwtService.decode(accessToken);
    const accessExpiresAt = decodedAccess?.exp ? new Date(decodedAccess.exp * 1000) : new Date();
    return {
      accessToken,
      refreshToken: newRefreshToken,
      accessExpiresAt,
      refreshExpiresAt,
      sessionId: payload.sessionId,
    };
  },

  async revokeSession(sessionId?: string) {
    if (sessionId) {
      sessions.delete(sessionId);
    }
  },

  async validateRefreshToken(refreshToken: string) {
    const payload = jwtService.verifyRefreshToken(refreshToken);
    const session = sessions.get(payload.sessionId);
    if (!session || session.userId !== payload.userId) {
      throw new Error("Session not found");
    }
    if (session.expiresAt.getTime() < Date.now()) {
      sessions.delete(payload.sessionId);
      throw new Error("Session expired");
    }
    const matches = await passwordService.verifyToken(refreshToken, session.refreshTokenHash);
    if (!matches) {
      sessions.delete(payload.sessionId);
      throw new Error("Invalid refresh token");
    }
    return { payload, session };
  },

  clearAllSessions() {
    sessions.clear();
  },
};
