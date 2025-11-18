import { PrismaClient } from "@prisma/client";
import logger from "../utils/logger.js";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

prisma
  .$connect()
  .then(() => logger.info("Prisma connected"))
  .catch((error) => {
    logger.error("Prisma connection failed", error);
    process.exit(1);
  });

export { prisma };
export default prisma;
