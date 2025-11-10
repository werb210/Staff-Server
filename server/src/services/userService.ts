import { randomUUID } from "node:crypto";
import { parseUpsertUserInput, type UpsertUserInput, type User } from "../schemas/user.schema.js";

class UserService {
  private readonly users = new Map<string, User>();

  constructor() {
    const seed: User = {
      id: randomUUID(),
      firstName: "Morgan",
      lastName: "Lee",
      email: "morgan.lee@example.com",
      phone: "+15551234567",
      role: "loan_officer",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.set(seed.id, seed);
  }

  listUsers(): User[] {
    return Array.from(this.users.values()).map((user) => ({ ...user }));
  }

  upsertUser(input: unknown): User {
    const payload: UpsertUserInput = parseUpsertUserInput(input);
    const id = payload.id ?? randomUUID();
    const existing = this.users.get(id);
    const now = new Date().toISOString();
    const user: User = {
      id,
      firstName: payload.firstName ?? existing?.firstName ?? "Unknown",
      lastName: payload.lastName ?? existing?.lastName ?? "User",
      email: payload.email ?? existing?.email ?? "unknown@example.com",
      phone: payload.phone ?? existing?.phone ?? "+15550000000",
      role: payload.role ?? existing?.role ?? "applicant",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    this.users.set(id, user);
    return { ...user };
  }
}

export const userService = new UserService();
export type { User } from "../schemas/user.schema.js";
