import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AuthError, authService, LoginResult } from "./auth.service";
import { loginSchema } from "./auth.validators";
import { setTokenCookies } from "./token.helpers";

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.parse(req.body);

      const normalized = {
        ...parsed,
        email: parsed.email.trim().toLowerCase(),
        password: parsed.password,
      };

      const result: LoginResult = await authService.login(normalized);

      setTokenCookies(res, result.tokens);

      res.json({
        user: result.user,
        tokens: result.tokens,
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
