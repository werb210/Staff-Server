import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { findAuthUserByEmail } from "./auth.repo";

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: { id: string; email: string; role: string }; token: string }> {
  const user = await findAuthUserByEmail(email);

  if (!user) {
    throw new Error("invalid_credentials");
  }

  const ok = await bcrypt.compare(password, user.password_hash);

  if (!ok) {
    throw new Error("invalid_credentials");
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("missing_jwt_secret");
  }

  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "1h") as SignOptions["expiresIn"];
  const options: SignOptions = { expiresIn };
  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    secret,
    options
  );

  return {
    token,
    user: {
    id: user.id,
    email: user.email,
    role: user.role,
    },
  };
}
