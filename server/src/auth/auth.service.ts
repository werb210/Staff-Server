import bcrypt from "bcrypt";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { createTokenPair, TokenPair } from "./token.service";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

type LoginInput = {
  email: string;
  password: string;
};

export const authService = {
  async login(input: LoginInput, meta?: { ipAddress?: string; userAgent?: string }) {
    const email = input.email.trim().toLowerCase();

    // 🔴 CRITICAL: explicitly select password_hash
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        password_hash: users.password_hash,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.isActive) {
      throw new AuthError("Invalid credentials", 401);
    }

    // ✅ TEMPORARY DEBUG — EXACTLY ONE LINE, EXACT LOCATION
    console.log("AUTH_DEBUG", {
      email: user.email,
      hasPasswordHash: !!user.password_hash,
      hashLength: user.password_hash?.length,
    });

    const ok = await bcrypt.compare(input.password, user.password_hash);

    if (!ok) {
      throw new AuthError("Invalid credentials", 401);
    }

    const tokens: TokenPair = await createTokenPair({
      userId: user.id,
      role: user.role,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      tokens,
    };
  },
};
