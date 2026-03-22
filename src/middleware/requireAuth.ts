export function requireAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;

  if (!auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}
