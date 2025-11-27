import express = require('express');
import { authenticateRequest } from '../services/authService';
import { getProfile, listUsers, updateProfile } from '../services/usersService';
import { validateBody, paginationSchema, updateProfileSchema } from '../utils/validate';

const router = express.Router();

router.get('/me', authenticateRequest, async (req, res, next) => {
  try {
    const userId = (req as express.Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const profile = await getProfile(userId);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

router.patch('/profile', authenticateRequest, async (req, res, next) => {
  try {
    const user = (req as express.Request & { user?: { id: string } }).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const payload = validateBody(updateProfileSchema, req.body);
    await updateProfile(user.id, payload);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticateRequest, async (req, res, next) => {
  try {
    const user = (req as express.Request & { user?: { id: string; role: 'ADMIN' | 'STAFF' | 'APPLICANT' } }).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const params = validateBody(paginationSchema, req.query);
    const users = await listUsers(user.role, params.skip, params.take);
    res.json(users);
  } catch (error) {
    next(error);
  }
});

export = router;
