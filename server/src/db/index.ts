import prisma from "./prisma.js";

export const db = prisma;
export { prisma };

export async function healthCheck() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export default prisma;
