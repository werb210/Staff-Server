import bcrypt from "bcrypt";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export const authService = {
  async login(
    input: { email: string; password: string },
    meta?: { ipAddress?: string; userAgent?: string }
  ) {
    const email = input.email.trim().toLowerCase();

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: {
        id: true,
        email: true,
        password_hash: true,
        role: true,
        is_active: true,
      },
    });

    if (!user) {
      throw new AuthError("Invalid credentials");
    }

    if (!user.is_active) {
      throw new AuthError("Account disabled", 403);
    }

    if (!user.password_hash) {
      throw new AuthError("Invalid credentials");
    }

    const passwordValid = await bcrypt.compare(
      input.password,
      user.password_hash
    );

    if (!passwordValid) {
      throw new AuthError("Invalid credentials");
    }

    // TEMP: token stub — keep existing token logic if you have it elsewhere
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      tokens: {
        accessToken: "VALID",
        refreshToken: "VALID",
      },
    };
  },

  async logout() {
    return;
  },

  async refresh() {
    throw new AuthError("Not implemented", 501);
  },
};
