import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

async function bootstrap(): Promise<void> {
  const app = await createApp();

  app.listen(env.port, () => {
    logger.info('AI Video Studio backend listening', {
      port: env.port,
      projectsRoot: env.projectsRoot
    });
  });
}

bootstrap().catch((error: unknown) => {
  logger.error('Failed to start backend', error);
  process.exitCode = 1;
});
