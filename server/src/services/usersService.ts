import bcrypt from 'bcrypt';
import { prisma } from '../db/prisma';
import { createLogger } from '../utils/logger';

const logger = createLogger('users-service');

type Role = 'ADMIN' | 'STAFF' | 'APPLICANT';

export async function createUser(email: string, password: string, role: Role = 'APPLICANT', name?: string): Promise<{ id: string; email: string; role: Role; name: string | null }> {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
      name: name || null,
    },
  });
  logger.info('User created', { userId: user.id, role });
  return { id: user.id, email: user.email, role: user.role as Role, name: user.name };
}

export async function getProfile(userId: string): Promise<{ id: string; email: string; role: Role; name: string | null; phone: string | null; timezone: string | null }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, name: true, phone: true, timezone: true },
  });
  if (!user) {
    const err = new Error('User not found');
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  return user as { id: string; email: string; role: Role; name: string | null; phone: string | null; timezone: string | null };
}

export async function updateProfile(userId: string, data: Partial<{ name: string; phone: string; timezone: string }>): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data });
  logger.info('Profile updated', { userId });
}

function assertAdmin(userRole: Role): void {
  if (userRole !== 'ADMIN') {
    const err = new Error('Admin access required');
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
}

export async function listUsers(requesterRole: Role, skip = 0, take = 20): Promise<Array<{ id: string; email: string; role: Role; name: string | null }>> {
  assertAdmin(requesterRole);
  const users = await prisma.user.findMany({
    skip,
    take,
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, role: true, name: true },
  });
  return users as Array<{ id: string; email: string; role: Role; name: string | null }>;
}
