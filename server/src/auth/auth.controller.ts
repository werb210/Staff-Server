import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { loginSchema } from "./auth.validators";
import { BadRequest } from "../errors";
import { verifyUserCredentials } from "../services/authService";
import { generateAccessToken } from "../utils/jwt";

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

      const user = await verifyUserCredentials(normalized.email, normalized.password);

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const { token: accessToken } = generateAccessToken(user);

      res.json({
        user,
        accessToken,
      });
    } catch (error) {
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
