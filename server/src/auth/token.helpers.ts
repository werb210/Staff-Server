import { Request, Response } from "express";
import { authConfig } from "../config/config";
import { TokenPair } from "./auth.types";

const secureCookie = process.env.NODE_ENV === "production";

export function setTokenCookies(res: Response, tokens: TokenPair) {
  if (authConfig.TOKEN_TRANSPORT === "body") return;
  res.cookie("access_token", tokens.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    maxAge: tokens.accessExpiresAt.getTime() - Date.now(),
    path: "/",
  });
  res.cookie("refresh_token", tokens.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    maxAge: tokens.refreshExpiresAt.getTime() - Date.now(),
    path: "/",
  });
}

export function maybeIncludeTokens(tokens: TokenPair) {
  if (authConfig.TOKEN_TRANSPORT === "cookie") return undefined;
  return tokens;
}

export function extractAccessToken(req: Request) {
  const header = req.headers.authorization;
  if (header?.toLowerCase().startsWith("bearer ")) {
    return header.split(" ")[1];
  }
  if (req.cookies?.access_token) return req.cookies.access_token as string;
  if (req.body?.accessToken) return req.body.accessToken as string;
  return null;
}

export function extractRefreshToken(req: Request) {
  if (req.body?.refreshToken) return req.body.refreshToken as string;
  if (req.cookies?.refresh_token) return req.cookies.refresh_token as string;
  const header = req.headers["x-refresh-token"];
  if (typeof header === "string") return header;
  return null;
}
