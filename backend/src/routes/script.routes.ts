import { Router } from 'express';

import type { ScriptGenerationInput, SupportedScriptDuration } from '../../../shared/index.js';
import type { ScriptGenerationService } from '../services/script-generation.service.js';
import type { ProjectStoreService } from '../services/project-store.service.js';

function parseDuration(value: unknown): SupportedScriptDuration {
  if (value === 30 || value === 45 || value === 60 || value === 90) {
    return value;
  }

  throw new Error('La duración debe ser una de estas opciones: 30, 45, 60 o 90 segundos.');
}

function validateGenerateScriptInput(payload: unknown): ScriptGenerationInput {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('El cuerpo de la solicitud debe ser un objeto JSON.');
  }

  const input = payload as Record<string, unknown>;
  const projectId = typeof input.projectId === 'string' ? input.projectId.trim() : '';
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  const language = typeof input.language === 'string' ? input.language.trim() : '';
  const niche = typeof input.niche === 'string' ? input.niche.trim() : '';
  const tone = typeof input.tone === 'string' ? input.tone.trim() : '';

  if (projectId.length < 3) {
    throw new Error('projectId es obligatorio.');
  }

  if (prompt.length < 10) {
    throw new Error('prompt debe contener al menos 10 caracteres.');
  }

  if (language.length < 2) {
    throw new Error('language es obligatorio.');
  }

  if (niche.length < 2) {
    throw new Error('niche es obligatorio.');
  }

  if (tone.length < 2) {
    throw new Error('tone es obligatorio.');
  }

  return {
    projectId,
    prompt,
    language,
    duration: parseDuration(input.duration),
    niche,
    tone
  };
}

export function createScriptRouter(
  scriptGenerationService: ScriptGenerationService,
  projectStore: ProjectStoreService
): Router {
  const router = Router();

  router.post('/generate', async (request, response, next) => {
    try {
      const input = validateGenerateScriptInput(request.body);
      const exists = await projectStore.hasProject(input.projectId);

      if (!exists) {
        response.status(404).json({ message: 'Proyecto no encontrado.' });
        return;
      }

      const script = await scriptGenerationService.generate(input);
      response.status(200).json({ data: script });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
