import { PrismaClient } from "@prisma/client";

export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

const prisma: PrismaClient = hasDatabaseUrl
  ? new PrismaClient()
  : (new Proxy(
      {},
      {
        get() {
          throw new Error(
            "DATABASE_URL is not set. Database-backed features are disabled.",
          );
        },
      },
    ) as PrismaClient);

export default prisma;
export { prisma };
