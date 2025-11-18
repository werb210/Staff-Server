// server/src/controllers/authController.ts
import { authService } from "../services/authService.js";

export const authController = {
  async register(req, res) {
    try {
      const user = await authService.register(req.body);
      res.json(user);
    } catch (err) {
      res.status(400).json({ error: err.message });
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
      res.status(400).json({ error: err.message });
    }
  },
};
