export function errorHandler(err: any, req: any, res: any, next: any) {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
