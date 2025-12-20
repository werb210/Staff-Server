import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AuthError, authService, LoginResult } from "./auth.service";
import { loginSchema } from "./auth.validators";
import { BadRequest } from "../errors";

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.parse(req.body);

      const normalized = {
        ...parsed,
        email: parsed.email.trim().toLowerCase(),
        password: parsed.password,
      };

      if (!normalized.password) {
        throw new BadRequest("password required");
      }

      const result: LoginResult = await authService.login(
        normalized as Parameters<typeof authService.login>[0],
      );

      const { accessToken, refreshToken } = result.tokens;

      res.json({
        user: result.user,
        accessToken,
        refreshToken,
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
