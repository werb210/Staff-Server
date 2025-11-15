import type { PrismaClient as GeneratedPrismaClient } from "@prisma/client";

let prismaPromise: Promise<GeneratedPrismaClient | null> | null = null;
let loggedError = false;

async function instantiatePrisma(): Promise<GeneratedPrismaClient | null> {
  try {
    const { PrismaClient } = await import("@prisma/client");
    return new PrismaClient();
  } catch (error) {
    if (!loggedError) {
      const message =
        error instanceof Error ? error.message : String(error ?? "unknown error");
      console.warn(
        `⚠️ Prisma client unavailable. Falling back to disabled data services. (${message})`
      );
      loggedError = true;
    }
    return null;
  }
}

export async function getPrismaClient(): Promise<GeneratedPrismaClient | null> {
  if (!prismaPromise) {
    prismaPromise = instantiatePrisma();
  }
  return prismaPromise;
}

export class PrismaClientUnavailableError extends Error {
  constructor() {
    super(
      "Prisma client is unavailable. Ensure prisma generate has been run and a database is configured."
    );
    this.name = "PrismaClientUnavailableError";
  }
}

export async function requirePrismaClient(): Promise<GeneratedPrismaClient> {
  const client = await getPrismaClient();
  if (!client) {
    throw new PrismaClientUnavailableError();
  }
  return client;
}
