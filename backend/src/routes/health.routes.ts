import { Router } from 'express';

import type { HealthCheckResponse } from '../../../shared/index.js';
import type { JobRegistryService } from '../services/job-registry.service.js';
import type { ProjectStoreService } from '../services/project-store.service.js';

export function createHealthRouter(projectStore: ProjectStoreService, jobRegistry: JobRegistryService): Router {
  const router = Router();

  router.get('/', async (_request, response) => {
    const storage = await projectStore.getStorageSummary();

    const payload: HealthCheckResponse = {
      service: 'ai-video-studio-backend',
      status: 'ok',
      timestamp: new Date().toISOString(),
      storage,
      jobs: {
        active: jobRegistry.countActive()
      }
    };

    response.status(200).json(payload);
  });

  return router;
}
