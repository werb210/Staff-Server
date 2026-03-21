import { Router } from 'express'

const router = Router()

router.get('/_int/runtime', (_req, res) => {
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'unknown'
  })
})

export default router
