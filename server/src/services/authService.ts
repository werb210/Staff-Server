import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { JwtUserPayload, Silo, User as DomainUser } from "../types/index.js";
import { requirePrismaClient } from "./prismaClient.js";

const JWT_SECRET = process.env.JWT_SECRET || "local-dev-secret";

type StoredUser = DomainUser & { passwordHash: string };

export type PublicUser = Omit<StoredUser, "passwordHash">;

function toPublicUser(user: StoredUser): PublicUser {
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signJwt(user: PublicUser) {
  const payload: JwtUserPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    silos: user.silos,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyJwt(token: string): JwtUserPayload {
  return jwt.verify(token, JWT_SECRET) as JwtUserPayload;
}

export async function findUserByEmail(email: string) {
  const prisma = await requirePrismaClient();
  const user = await prisma.user.findUnique({ where: { email } });
  return user ? (user as StoredUser) : null;
}

export async function findUserById(id: string) {
  const prisma = await requirePrismaClient();
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? (user as StoredUser) : null;
}

export async function createUser(data: {
  email: string;
  password: string;
  role: string;
  silos: Silo[];
}) {
  const passwordHash = await hashPassword(data.password);

  const prisma = await requirePrismaClient();
  const user = (await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      role: data.role,
      silos: data.silos,
    },
  })) as StoredUser;

  return toPublicUser(user);
}

export function sanitizeUser(user: StoredUser | PublicUser) {
  return toPublicUser(user as StoredUser);
}
