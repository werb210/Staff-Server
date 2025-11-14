import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient, type Silo, type User } from "@prisma/client";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "local-dev-secret";

export interface JwtUserPayload extends jwt.JwtPayload {
  id: string;
  email: string;
  role: string;
  silos: Silo[];
}

export type PublicUser = Omit<User, "passwordHash">;

function toPublicUser(user: User): PublicUser {
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
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(data: {
  email: string;
  password: string;
  role: string;
  silos: Silo[];
}) {
  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      role: data.role,
      silos: data.silos,
    },
  });

  return toPublicUser(user);
}

export function sanitizeUser(user: User) {
  return toPublicUser(user);
}
