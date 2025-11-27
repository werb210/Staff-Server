import type { Request, Response } from "express";
import { authService } from "../services/authService";

export const authController = {
  register: async (req: Request, res: Response) => {
    try {
      const user = await authService.register(req.body);
      res.json(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed";
      res.status(400).json({ error: message });
    }
  },

  login: async (req: Request, res: Response) => {
    try {
      const { user, token } = await authService.login(req.body.email, req.body.password);
      res.json({ user, token });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      res.status(400).json({ error: message });
    }
  },
};
