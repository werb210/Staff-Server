import type { PrismaClient } from "@prisma/client";
import pkg from "pg";

const { Pool } = pkg;

let prismaInstance: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = require("@prisma/client") as { PrismaClient: new () => PrismaClient };
    prismaInstance = new PrismaClient();
  }

  return prismaInstance;
}

export const prisma = new Proxy({} as PrismaClient, {
  get: (_target, prop, receiver) => Reflect.get(getPrisma() as object, prop, receiver)
}) as PrismaClient;

export const db = prisma;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function queryWithRetry(text: string, params: unknown[] = [], retries = 3) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return queryWithRetry(text, params, retries - 1);
  }
}

export const queryDb = {
  query: queryWithRetry
};
