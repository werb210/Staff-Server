import express = require('express');
import { authenticateRequest } from '../services/authService';
import { sendOtp, verifyOtp } from '../services/smsService';
import { otpSchema } from '../utils/validate';

const router = express.Router();

router.post('/otp', authenticateRequest, async (req, res, next) => {
  try {
    const user = (req as express.Request & { user?: { id: string; phone?: string } }).user;
    const phone = (req.body && req.body.phone) || user?.phone;
    if (!user || !phone) {
      res.status(400).json({ error: 'Phone number required' });
      return;
    }
    const result = await sendOtp(user.id, phone);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/otp/verify', authenticateRequest, async (req, res, next) => {
  try {
    const payload = otpSchema.parse(req.body);
    const verified = await verifyOtp(payload.userId, payload.code);
    res.json({ verified });
  } catch (error) {
    next(error);
  }
});

export = router;
