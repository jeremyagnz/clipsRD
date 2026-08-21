import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createHealthRouter } from './routes/health.routes.js';
import { createProjectRouter } from './routes/project.routes.js';
import { JobRegistryService } from './services/job-registry.service.js';
import { ProjectStoreService } from './services/project-store.service.js';

const projectStore = new ProjectStoreService(env.projectsRoot);
const jobRegistry = new JobRegistryService();

export async function createApp() {
  await projectStore.ensureReady();

  const app = express();

  app.use(
    cors({
      origin: env.corsOrigin
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (_request, response) => {
    response.status(200).json({
      name: 'AI Video Studio API',
      version: '0.1.0',
      status: 'ready'
    });
  });

  app.use('/api/health', createHealthRouter(projectStore, jobRegistry));
  app.use('/api/projects', createProjectRouter(projectStore));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
