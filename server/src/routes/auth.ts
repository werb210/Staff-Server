import express = require('express');
import { authenticateRequest, login, logout, refresh, requestPasswordReset, resetPassword, verifyOtp as verifyAuthOtp } from '../services/authService';
import { sendOtp } from '../services/smsService';
import { validateBody, loginSchema, otpSchema, refreshSchema, resetSchema } from '../utils/validate';

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const payload = validateBody(loginSchema, req.body);
    const result = await login(payload.email, payload.password, req.ip, req.headers['user-agent'] as string | undefined);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = validateBody(refreshSchema, req.body);
    await logout(refreshToken);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = validateBody(refreshSchema, req.body);
    const tokens = await refresh(refreshToken);
    res.json(tokens);
  } catch (error) {
    next(error);
  }
});

router.post('/reset', async (req, res, next) => {
  try {
    const payload = validateBody(resetSchema, req.body);
    if (payload.token && payload.password) {
      await resetPassword(payload.token, payload.password);
      res.status(204).end();
      return;
    }
    await requestPasswordReset(payload.email);
    res.status(202).json({ message: 'Reset instructions dispatched' });
  } catch (error) {
    next(error);
  }
});

router.post('/otp/verify', authenticateRequest, async (req, res, next) => {
  try {
    const payload = validateBody(otpSchema, req.body);
    const userId = payload.userId || (req as express.Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(400).json({ error: 'User id required' });
      return;
    }
    const verified = await verifyAuthOtp(userId, payload.code);
    res.json({ verified });
  } catch (error) {
    next(error);
  }
});

router.post('/otp/send', authenticateRequest, async (req, res, next) => {
  try {
    const user = (req as express.Request & { user?: { id: string; phone?: string } }).user;
    if (!user || !user.phone) {
      res.status(400).json({ error: 'User phone missing' });
      return;
    }
    const result = await sendOtp(user.id, user.phone);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export = router;
