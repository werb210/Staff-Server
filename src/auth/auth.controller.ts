import { Request, Response } from "express";
import jwt from "jsonwebtoken";

export function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "missing_credentials" });
  }

  // REAL CHECK REQUIRED — FAIL HARD
  return res.status(501).json({ error: "auth_not_implemented" });
}

export function status(_req: Request, res: Response) {
  res.status(200).json({ status: "auth_online" });
}
