import bcrypt from "bcryptjs";
import { findAuthUserByEmail } from "./auth.repo";

export async function loginUser(
  email: string,
  password: string
): Promise<{ id: string; email: string; role: string }> {
  const user = await findAuthUserByEmail(email);

  if (!user) {
    throw new Error("invalid_credentials");
  }

  const ok = await bcrypt.compare(password, user.password_hash);

  if (!ok) {
    throw new Error("invalid_credentials");
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}
