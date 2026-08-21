import cors from 'cors';
import express from 'express';

import type { LlmProvider } from '../../shared/index.js';

import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { OllamaProvider } from './providers/ollama.provider.js';
import { createHealthRouter } from './routes/health.routes.js';
import { createProjectRouter } from './routes/project.routes.js';
import { createScriptRouter } from './routes/script.routes.js';
import { JobRegistryService } from './services/job-registry.service.js';
import { ProjectStoreService } from './services/project-store.service.js';
import { ScriptGenerationService } from './services/script-generation.service.js';

interface AppDependencies {
  readonly jobRegistry?: JobRegistryService;
  readonly llmProvider?: LlmProvider;
  readonly projectStore?: ProjectStoreService;
  readonly scriptGenerationService?: ScriptGenerationService;
}

export async function createApp(dependencies: AppDependencies = {}) {
  const projectStore = dependencies.projectStore ?? new ProjectStoreService(env.projectsRoot);
  const jobRegistry = dependencies.jobRegistry ?? new JobRegistryService();
  const llmProvider = dependencies.llmProvider ?? new OllamaProvider(env.ollamaBaseUrl, env.ollamaModel);
  const scriptGenerationService =
    dependencies.scriptGenerationService ?? new ScriptGenerationService(projectStore, llmProvider);

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
  app.use('/api/script', createScriptRouter(scriptGenerationService, projectStore));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
