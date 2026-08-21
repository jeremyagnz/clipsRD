import { Router } from 'express';

import type { CreateProjectInput } from '../../../shared/index.js';
import type { ProjectStoreService } from '../services/project-store.service.js';

function validateCreateProjectInput(payload: unknown): CreateProjectInput {
  if (!payload || typeof payload !== 'object') {
    throw new Error('El cuerpo de la solicitud debe ser un objeto JSON.');
  }

  const input = payload as Record<string, unknown>;
  const idea = typeof input.idea === 'string' ? input.idea.trim() : '';
  const title = typeof input.title === 'string' ? input.title.trim() : undefined;
  const durationSeconds =
    typeof input.durationSeconds === 'number' && Number.isFinite(input.durationSeconds)
      ? input.durationSeconds
      : undefined;

  if (idea.length < 10) {
    throw new Error('La idea debe contener al menos 10 caracteres.');
  }

  if (idea.length > 500) {
    throw new Error('La idea no puede superar los 500 caracteres.');
  }

  if (durationSeconds !== undefined && (durationSeconds < 15 || durationSeconds > 300)) {
    throw new Error('La duración debe estar entre 15 y 300 segundos.');
  }

  return {
    idea,
    title,
    durationSeconds
  };
}

export function createProjectRouter(projectStore: ProjectStoreService): Router {
  const router = Router();

  router.get('/', async (_request, response, next) => {
    try {
      const projects = await projectStore.listProjects();
      response.status(200).json({ data: projects });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:projectId', async (request, response, next) => {
    try {
      const exists = await projectStore.hasProject(request.params.projectId);

      if (!exists) {
        response.status(404).json({ message: 'Proyecto no encontrado.' });
        return;
      }

      const project = await projectStore.getProject(request.params.projectId);
      response.status(200).json({ data: project });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (request, response, next) => {
    try {
      const input = validateCreateProjectInput(request.body);
      const project = await projectStore.createProject(input);
      response.status(201).json({ data: project });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
