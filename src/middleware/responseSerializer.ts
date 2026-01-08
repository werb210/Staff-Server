import { type NextFunction, type Request, type Response } from "express";

function normalizeAccessToken(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return body;
  }

  const descriptor = Object.getOwnPropertyDescriptor(body, "accessToken");
  if (!descriptor || descriptor.enumerable) {
    return body;
  }

  const normalized: Record<string, unknown> = {
    ...(body as Record<string, unknown>),
  };
  normalized.accessToken = Reflect.get(body, "accessToken");
  return normalized;
}

export function responseSerializer(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => originalJson(normalizeAccessToken(body));
  next();
}
