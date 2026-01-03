import bcrypt from "bcryptjs";
import { getUserByEmail } from "./auth.repo";

export async function authenticateUser(email: string, password: string) {
  const user = await getUserByEmail(email);

  if (!user) {
    return null;
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
  };
}
