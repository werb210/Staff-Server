export function requireIdempotency(req: any, res: any, next: any) {
  if (!req.headers["idempotency-key"]) {
    return res.status(400).json({ error: "Missing Idempotency-Key" });
  }
  next();
}
