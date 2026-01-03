import bcrypt from "bcryptjs";
import { findAuthUserByEmail } from "./auth.repo";

export async function login(email: string, password: string) {
  const user = await findAuthUserByEmail(email);
  if (!user) return null;

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;

  return { id: user.id, email: user.email };
}

export async function loginUser(email: string, password: string) {
  return login(email, password);
}
