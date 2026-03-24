import { startServer } from './server/index';
import { bootstrapStartup } from './startup/bootstrap';
import { logger } from './infra/logger';
import { validateStartup } from './startup/validateStartup';

validateStartup();

async function bootstrap() {
  try {
    await bootstrapStartup();
    await startServer();
  } catch (err) {
    logger.error('fatal_startup_error', { err: err instanceof Error ? err.message : String(err) });
    process.exit(1);
  }
}

void bootstrap();
