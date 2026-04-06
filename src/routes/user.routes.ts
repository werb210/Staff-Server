import { Router } from 'express';
import { requireAuth } from '../middleware/auth';

export const userRoutes = Router();

userRoutes.get('/me', requireAuth, (req, res) => {
  res.json({ user: (req as any).user });
});
