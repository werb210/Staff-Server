import { NextFunction, Request, Response } from "express";
import { TokenExpiredError } from "jsonwebtoken";
import { extractAccessToken, extractRefreshToken, setTokenCookies } from "../auth/token.helpers";
import { jwtService } from "../services/jwt.service";
import { sessionService } from "../services/session.service";
import { findUserById, mapAuthenticated } from "../services/user.service";

async function resolveUser(userId: string) {
  const userRecord = await findUserById(userId);
  return mapAuthenticated(userRecord);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const accessToken = extractAccessToken(req);
  const refreshToken = extractRefreshToken(req);

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const setUserAndContinue = async (payload: { userId: string; email: string; role: any; sessionId: string }) => {
    const user = await resolveUser(payload.userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    req.user = { ...user, sessionId: payload.sessionId };
    return next();
  };

  try {
    if (accessToken) {
      const payload = jwtService.verifyAccessToken(accessToken);
      return await setUserAndContinue(payload);
    }
  } catch (error) {
    if (!(error instanceof TokenExpiredError)) {
      if (!refreshToken) return res.status(401).json({ error: "Invalid token" });
    }
  }

  if (!refreshToken) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const { payload } = await sessionService.validateRefreshToken(refreshToken);
    const user = await resolveUser(payload.userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    const tokens = await sessionService.refreshSession(user, refreshToken);
    setTokenCookies(res, tokens);
    res.locals.tokens = tokens;
    req.user = { ...user, sessionId: tokens.sessionId };
    return next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return res.status(401).json({ error: "Session expired" });
    }
    return res.status(401).json({ error: "Invalid session" });
  }
}
