import { Router } from 'express';

const router = Router();

export function intHealthHandler(_req: any, res: any) {
  return res.json({
    success: true,
    status: 'ok',
  });
}

router.get('/', intHealthHandler);

export default router;
