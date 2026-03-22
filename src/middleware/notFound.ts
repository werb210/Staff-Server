export function notFound(req: any, res: any) {
  res.status(404).json({
    error: "Not Found",
    path: req.originalUrl,
    method: req.method,
  });
}
