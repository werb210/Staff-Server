import express from 'express';
const router = express.Router();

router.get('/health/db', (req, res) => {
  return res.status(200).json({ status: 'ok' });
});

export default router;
