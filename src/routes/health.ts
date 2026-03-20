import { Router } from "express";
import { isReady } from "../startupState";

const router = Router();

router.get('/health/db', (req, res) => {
  if (process.env.TEST_MODE === 'true') {
    return res.status(200).json({
      status: 'ok',
      db: 'skipped',
    });
  }

  const ready = isReady();

  if (!ready) {
    return res.status(503).json({
      status: 'db-failed',
      db: 'disconnected',
    });
  }

  return res.status(200).json({
    status: 'ok',
    db: 'connected',
  });
});

export default router;
