import { PrismaClient } from "@prisma/client";

let prismaInitError: Error | null = null;
let prismaClient: PrismaClient | null = null;

const missingDbUrl = !process.env.DATABASE_URL;

if (missingDbUrl) {
  prismaInitError = new Error("DATABASE_URL is not set; Prisma client disabled.");
}

if (!prismaInitError) {
  try {
    prismaClient = new PrismaClient() as any;
  } catch (err) {
    prismaInitError = err as Error;
  }
}

const createUnavailableModelProxy = (path: string[]): any =>
  new Proxy(
    {},
    {
      get(_target, prop) {
        return async () => {
          const reason =
            prismaInitError?.message ||
            "Prisma client is unavailable (missing DATABASE_URL).";
          throw new Error(
            `Prisma unavailable at ${[...path, String(prop)].join(".")}: ${reason}`
          );
        };
      },
    }
  );

const prismaFallback = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === "$connect" || prop === "$disconnect") {
        return async () => {};
      }

      return createUnavailableModelProxy([String(prop)]);
    },
  }
) as unknown as PrismaClient;

export const prisma = (prismaClient || prismaFallback) as any;
export const prismaIsAvailable = prismaClient !== null && prismaInitError === null;
export { prismaInitError };

export default prisma;
