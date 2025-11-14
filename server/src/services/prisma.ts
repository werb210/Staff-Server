import { PrismaClient } from "@prisma/client";
import type { Silo as PrismaSilo, User } from "@prisma/client";

export const prisma = new PrismaClient();

export type Silo = PrismaSilo;

export type UserContext = Pick<User, "silos"> & Partial<Pick<User, "id">>;

export class SiloAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SiloAccessError";
  }
}

/**
 * Ensures a user can only access their assigned silos.
 */
export function requireUserSiloAccess(userSilos: Silo[], targetSilo: Silo) {
  if (!userSilos.includes(targetSilo)) {
    throw new SiloAccessError(
      `User is not authorized to access silo ${targetSilo}`
    );
  }
}
