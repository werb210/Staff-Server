// server/src/services/authService.ts
import bcrypt from "bcrypt";
import { registry } from "../db/registry.js";
import { StoredUser, Silo } from "../types/user.js";

/**
 * Normalize DB row → StoredUser
 */
function mapToStoredUser(row: any): StoredUser {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    silos: Array.isArray(row.silos) ? row.silos : [],
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
    passwordHash: row.password_hash ?? row.passwordHash,
    name:
      typeof row.name === "string" && row.name.trim().length > 0
        ? row.name.trim()
        : "Unknown User",
  };
}

/**
 * LOGIN USER
 */
export async function loginUser(
  email: string,
  password: string
): Promise<StoredUser | null> {
  const row = await registry.users.findByEmail(email);
  if (!row) return null;

  const match = await bcrypt.compare(
    password,
    row.password_hash ?? row.passwordHash
  );
  if (!match) return null;

  return mapToStoredUser(row);
}

/**
 * GET USER BY ID
 */
export async function getUserById(id: string): Promise<StoredUser | null> {
  const row = await registry.users.findById(id);
  if (!row) return null;

  return mapToStoredUser(row);
}

interface CreateUserInput {
  email: string;
  password: string;
  role: string;
  silos: Silo[];
  name?: string | null;
}

/**
 * REGISTER USER
 */
export async function createUser(input: CreateUserInput): Promise<StoredUser> {
  const passwordHash = await bcrypt.hash(input.password, 10);

  const safeName =
    typeof input.name === "string" && input.name.trim().length > 0
      ? input.name.trim()
      : "Unknown User";

  const row = await registry.users.create({
    email: input.email,
    password_hash: passwordHash,
    role: input.role,
    silos: input.silos,
    name: safeName,
  });

  return mapToStoredUser(row);
}

export default {
  loginUser,
  getUserById,
  createUser,
};
