import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { authService, AuthError } from "./auth.service";
import { loginSchema, refreshSchema } from "./auth.validators";
import { extractRefreshToken, maybeIncludeTokens, setTokenCookies } from "./token.helpers";

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.parse(req.body);
      const normalized = { ...parsed, email: parsed.email.toLowerCase() };
      const result = await authService.login(normalized, {
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || undefined,
      });
      setTokenCookies(res, result.tokens);
      res.json({ user: result.user, tokens: maybeIncludeTokens(result.tokens) });
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(error.status).json({ error: error.message });
      }
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors.map((e) => e.message).join(", ") });
      }
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = extractRefreshToken(req);
      await authService.logout(req.user?.sessionId, refreshToken ?? undefined);
      res.clearCookie("access_token");
      res.clearCookie("refresh_token");
      res.status(204).send();
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(error.status).json({ error: error.message });
      }
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = extractRefreshToken(req);
      const parsed = refreshSchema.parse({ refreshToken: token });
      const result = await authService.refresh(parsed.refreshToken);
      setTokenCookies(res, result.tokens);
      res.json({ user: result.user, tokens: maybeIncludeTokens(result.tokens) });
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(error.status).json({ error: error.message });
      }
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors.map((e) => e.message).join(", ") });
      }
      next(error);
    }
  },

  async me(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    return res.json({ user: req.user });
  },
};
