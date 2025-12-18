import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AuthError, authService } from "./auth.service";
import {
  loginSchema,
  refreshSchema,
  startVerificationSchema,
} from "./auth.validators";
import { twilioVerifyService } from "../services/twilioVerify.service";
import {
  extractRefreshToken,
  maybeIncludeTokens,
  setTokenCookies,
} from "./token.helpers";
import { findUserByEmail } from "../services/user.service";

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.parse(req.body);
      if (!parsed.password) {
        return res.status(400).json({ error: "Password required" });
      }

      const normalized = {
        ...parsed,
        email: parsed.email.trim().toLowerCase(),
        password: parsed.password,
      };

      const result = await authService.login(normalized, {
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || undefined,
      });

      setTokenCookies(res, result.tokens);

      res.json({
        user: result.user,
        tokens: maybeIncludeTokens(result.tokens),
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(error.status).json({ error: error.message });
      }
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ error: error.errors.map((e) => e.message).join(", ") });
      }
      next(error);
    }
  },

  async startVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = startVerificationSchema.parse(req.body);
      const normalizedEmail = parsed.email.trim().toLowerCase();

      const user = await findUserByEmail(normalizedEmail);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!twilioVerifyService.isEnabled()) {
        return res.status(501).json({ error: "Twilio not configured" });
      }

      await twilioVerifyService.startVerification(normalizedEmail);
      res.status(202).json({ status: "pending" });
    } catch (error) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ error: error.errors.map((e) => e.message).join(", ") });
      }
      return res.status(400).json({ error: (error as Error).message });
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = extractRefreshToken(req);
      await authService.logout(
        req.user?.sessionId,
        refreshToken ?? undefined,
      );

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

      res.json({
        user: result.user,
        tokens: maybeIncludeTokens(result.tokens),
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(error.status).json({ error: error.message });
      }
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ error: error.errors.map((e) => e.message).join(", ") });
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
