// FILE: server/src/controllers/authController.ts
import { Request, Response } from "express";
import authService from "../services/authService.js";

export const login = async (req: Request, res: Response) => {
  const token = await authService.login(req.body.email, req.body.password);
  res.json({ token });
};

export const me = async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.id);
  res.json(user);
};

export default { login, me };
