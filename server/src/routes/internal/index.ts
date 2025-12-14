import { Router } from 'express';
import { connectDb } from '../../db';

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    await connectDb();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
