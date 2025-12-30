import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { findAuthUserByEmail } from "./auth.repo";
import { type AuthLoginRequestBody } from "./auth.types";

export type AuthLoginResult =
  | { ok: true; token: string }
  | { ok: false; status: 400 | 401; error: "missing_fields" | "invalid_credentials" };

export async function loginUser(payload: AuthLoginRequestBody): Promise<AuthLoginResult> {
  const { email, password } = payload;

  if (!email || !password) {
    return { ok: false, status: 400, error: "missing_fields" };
  }

  const user = await findAuthUserByEmail(email);
  if (!user) {
    return { ok: false, status: 401, error: "invalid_credentials" };
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return { ok: false, status: 401, error: "invalid_credentials" };
  }

  const token = jwt.sign({ uid: user.id }, process.env.JWT_SECRET!, {
    expiresIn: "1h",
  });

  return { ok: true, token };
}
