import { Request, Response, NextFunction } from 'express'

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()

  console.log('request_started', { path: req.path })

  res.on('finish', () => {
    console.log('request_completed', {
      path: req.path,
      durationMs: Date.now() - start
    })
  })

  next()
}
