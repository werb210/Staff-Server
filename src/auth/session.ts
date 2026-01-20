import { type CookieOptions, type Request, type Response } from "express";

export const AUTH_SESSION_COOKIE_NAME = "staff_session";

export const AUTH_SESSION_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  domain: ".boreal.financial",
  path: "/",
};

type CookieBag = Record<string, string>;

function parseCookieHeader(header: string | undefined): CookieBag {
  if (!header) {
    return {};
  }
  return header.split(";").reduce<CookieBag>((acc, part) => {
    const trimmed = part.trim();
    if (!trimmed) {
      return acc;
    }
    const [rawName, ...rawValueParts] = trimmed.split("=");
    if (!rawName) {
      return acc;
    }
    const rawValue = rawValueParts.join("=");
    const value = rawValue ? decodeURIComponent(rawValue) : "";
    acc[rawName] = value;
    return acc;
  }, {});
}

export function getSessionTokenFromRequest(req: Request): string | null {
  const cookies = (req as Request & { cookies?: CookieBag }).cookies;
  if (cookies && typeof cookies[AUTH_SESSION_COOKIE_NAME] === "string") {
    return cookies[AUTH_SESSION_COOKIE_NAME];
  }
  const parsed = parseCookieHeader(req.headers.cookie);
  return typeof parsed[AUTH_SESSION_COOKIE_NAME] === "string"
    ? parsed[AUTH_SESSION_COOKIE_NAME]
    : null;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(AUTH_SESSION_COOKIE_NAME, token, AUTH_SESSION_COOKIE_OPTIONS);
}
