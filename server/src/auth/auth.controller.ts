import { Request, Response, NextFunction } from "express";
import { loginSchema } from "./auth.validators";
import { BadRequest } from "../errors";
import { verifyUserCredentials } from "../services/authService";
import { generateAccessToken } from "../utils/jwt";

export const me = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthenticated" });
  }
  return res.status(200).json(req.user);
};

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.parse(req.body);

      const user = await verifyUserCredentials(
        parsed.email.trim().toLowerCase(),
        parsed.password
      );

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const { token } = generateAccessToken(user);
      return res.status(200).json({ token });
    } catch (err) {
      next(err instanceof BadRequest ? err : new BadRequest("Login failed"));
    }
  },
};
