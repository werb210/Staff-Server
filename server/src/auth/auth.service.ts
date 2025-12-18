import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { sessionService } from "../services/session.service";
import {
  AuthenticatedUser,
  LoginResult,
  RefreshResult,
  RequestContext,
} from "./auth.types";

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

type UserWithPassword = Pick<
  typeof users.$inferSelect,
  "id" | "email" | "passwordHash" | "role" | "status" | "firstName" | "lastName"
>;

function toAuthenticatedUser(user: UserWithPassword): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role as AuthenticatedUser["role"],
    status: user.status as AuthenticatedUser["status"],
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

async function findUserByEmail(email: string): Promise<UserWithPassword | undefined> {
  return db.query.users.findFirst({
    where: eq(users.email, email),
    columns: {
      id: true,
      email: true,
      passwordHash: true,
      role: true,
      status: true,
      firstName: true,
      lastName: true,
    },
  });
}

async function findUserById(id: string): Promise<UserWithPassword | undefined> {
  return db.query.users.findFirst({
    where: eq(users.id, id),
    columns: {
      id: true,
      email: true,
      passwordHash: true,
      role: true,
      status: true,
      firstName: true,
      lastName: true,
    },
  });
}

export const authService = {
  async login(
    input: { email: string; password: string },
    _meta?: RequestContext,
  ): Promise<LoginResult> {
    const email = input.email.trim().toLowerCase();

    const user = await findUserByEmail(email);

    if (!user || !user.passwordHash) {
      throw new AuthError("Invalid credentials");
    }

    if (user.status !== "active") {
      throw new AuthError("Account disabled", 403);
    }

    const passwordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!passwordValid) {
      throw new AuthError("Invalid credentials");
    }

    const authenticatedUser = toAuthenticatedUser(user);
    const tokens = await sessionService.createSession(authenticatedUser);

    return { user: authenticatedUser, tokens };
  },

  async logout(sessionId?: string, refreshToken?: string) {
    if (!sessionId && refreshToken) {
      try {
        const { payload } = await sessionService.validateRefreshToken(refreshToken);
        sessionId = payload.sessionId;
      } catch {
        // Ignore invalid refresh tokens during logout
      }
    }

    await sessionService.revokeSession(sessionId);
  },

  async refresh(refreshToken: string): Promise<RefreshResult> {
    const { payload } = await sessionService.validateRefreshToken(refreshToken);
    const user = await findUserById(payload.userId);

    if (!user) {
      throw new AuthError("User not found", 404);
    }

    if (user.status !== "active") {
      throw new AuthError("Account disabled", 403);
    }

    const authenticatedUser = toAuthenticatedUser(user);
    const tokens = await sessionService.refreshSession(authenticatedUser, refreshToken);

    return { user: authenticatedUser, tokens };
  },
};
