import { Router } from 'express';
import { storeOtp, verifyOtp, issueToken } from '../services/auth.service';

export const authRoutes = Router();

authRoutes.post('/otp/start', async (req, res) => {
  const { phone } = req.body;

  const code = '123456'; // replace with real provider later
  await storeOtp(phone, code);

  res.json({ success: true });
});

authRoutes.post('/otp/verify', async (req, res) => {
  const { phone, code } = req.body;

  const valid = await verifyOtp(phone, code);
  if (!valid) return res.status(401).json({ error: 'Invalid OTP' });

  const token = issueToken({ phone });

  res.json({ token });
});
