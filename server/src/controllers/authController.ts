import { Request, Response, NextFunction } from "express";
import authService from "../services/authService";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, role } = req.body ?? {};
    const result = await authService.register(email, password, role);
    res.status(201).json({ ok: true, user: result.user });
  } catch (err: any) {
    if (err instanceof Error && err.message === "Email already registered") {
      res.status(400).json({ ok: false, error: err.message });
      return;
    }
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body ?? {};
    const result = await authService.login(email, password);
    res.json({ ok: true, user: result.user });
  } catch (err: any) {
    if (err instanceof Error && err.message === "Invalid credentials") {
      res.status(401).json({ ok: false, error: err.message });
      return;
    }
    next(err);
  }
}

export async function me(req: Request, res: Response) {
  // Placeholder – you can wire this to actual auth middleware later
  res.status(501).json({ ok: false, error: "Not implemented" });
}

export default {
  register,
  login,
  me,
};
