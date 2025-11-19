// server/src/controllers/authController.ts
import { authService } from "../services/authService.js";

export const authController = {
  async register(req, res) {
    try {
      const user = await authService.register(req.body);
      res.json(user);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: message });
    }
  },

  async login(req, res) {
    try {
      const { user, token } = await authService.login(
        req.body.email,
        req.body.password
      );
      res.json({ user, token });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: message });
    }
  },
};
