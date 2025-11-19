import { PrismaClient } from "@prisma/client";

// Cast to any to allow access to dynamic model properties that may not yet be
// reflected in the generated Prisma client types.
export const prisma = new PrismaClient() as any;

export default prisma;
