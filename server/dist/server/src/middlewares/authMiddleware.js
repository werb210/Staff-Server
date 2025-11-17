export default function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const parts = header.split(" ");

  const scheme = parts[0];
  const token = parts[1];

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ ok: false, error: "Invalid token format" });
  }

  req.user = { token };
  next();
}
