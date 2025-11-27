import { PrismaClient } from '@prisma/client';
import { env, optionalNumber } from '../utils/env';
import { createLogger } from '../utils/logger';

const logger = createLogger('prisma');

function withConnectionLimit(url: string, connectionLimit: number): string {
  const delimiter = url.includes('?') ? '&' : '?';
  const param = `connection_limit=${connectionLimit}`;
  return url.includes('connection_limit') ? url : `${url}${delimiter}${param}`;
}

const poolSize = optionalNumber(env.DATABASE_POOL_MAX, 10);
const connectionString = withConnectionLimit(env.DATABASE_URL, poolSize);

const client = new PrismaClient({
  datasources: { db: { url: connectionString } },
  log: ['warn', 'error'],
});

export const prisma: any = client;

prisma.$on?.('beforeExit', async () => {
  logger.info('Prisma client is disconnecting');
});
