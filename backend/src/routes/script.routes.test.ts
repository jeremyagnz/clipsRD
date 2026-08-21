import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import type { LlmGenerateInput, LlmProvider } from '../../../shared/index.js';

import { createApp } from '../app.js';
import { JobRegistryService } from '../services/job-registry.service.js';
import { ProjectStoreService } from '../services/project-store.service.js';

class SequenceLlmProvider implements LlmProvider {
  readonly name = 'mock-llm';

  constructor(private readonly responses: string[]) {}

  async generateText(_input: LlmGenerateInput): Promise<string> {
    const response = this.responses.shift();

    if (!response) {
      throw new Error('No mock response available.');
    }

    return response;
  }
}

async function listen(server: http.Server): Promise<number> {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('No se pudo obtener el puerto del servidor de prueba.');
  }

  return address.port;
}

test('POST /api/script/generate genera y persiste el script del proyecto', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'clipsrd-script-route-'));

  try {
    const projectStore = new ProjectStoreService(tempRoot);
    await projectStore.ensureReady();
    const project = await projectStore.createProject({
      idea: 'Cuenta una historia corta sobre un dato científico inesperado.',
      durationSeconds: 45
    });

    const llmProvider = new SequenceLlmProvider([
      JSON.stringify({
        hooks: [
          { text: 'Nadie espera este detalle del cerebro.', technique: 'curiosidad', score: 76, rationale: 'Abre una brecha de información.' },
          { text: '¿Y si tu cerebro estuviera editando la realidad?', technique: 'pregunta inesperada', score: 89, rationale: 'Dispara una pregunta potente.' },
          { text: 'Tu cerebro rellena huecos todo el tiempo.', technique: 'afirmación sorprendente pero verificable', score: 92, rationale: 'Sorprende y se puede explicar.' },
          { text: 'Ves continuidad, pero tu cerebro trabaja a saltos.', technique: 'contraste', score: 81, rationale: 'Usa un contraste claro.' },
          { text: 'Lo más raro ocurre antes de que te des cuenta.', technique: 'historia incompleta', score: 75, rationale: 'Deja el dato abierto.' }
        ],
        selectedHookId: 'hook-3'
      }),
      JSON.stringify({
        title: 'Cómo tu cerebro rellena huecos',
        topic: 'percepción y cerebro',
        hook: 'Tu cerebro rellena huecos todo el tiempo.',
        script: 'Tu cerebro rellena huecos todo el tiempo. Cuando algo falta, intenta completar la escena en milisegundos. Lo hace para ayudarte a reaccionar rápido y entender lo que ves sin detenerte a analizar cada detalle. Por eso a veces juras haber visto o escuchado algo que no estaba completo. No es magia. Es una herramienta de ahorro mental que normalmente te ayuda. El problema es que también puede engañarte cuando la información llega cortada, borrosa o demasiado rápido. Ahí nacen varias ilusiones y errores de percepción. Si quieres más ciencia contada simple, sígueme.',
        cta: 'Si quieres más ciencia contada simple, sígueme.',
        scenes: [
          { id: 'scene-1', narration: 'Tu cerebro rellena huecos todo el tiempo.', duration: 8, visualPrompt: 'Persona observando una escena incompleta que el cerebro completa visualmente', caption: 'Tu cerebro completa', transition: 'cut' },
          { id: 'scene-2', narration: 'Cuando algo falta, intenta completar la escena en milisegundos.', duration: 10, visualPrompt: 'Animación de señales neuronales completando una imagen faltante', caption: 'Lo hace rapidísimo', transition: 'zoom' },
          { id: 'scene-3', narration: 'Por eso a veces juras haber visto algo que no estaba completo.', duration: 10, visualPrompt: 'Ilusión visual sutil con reacción sorprendida', caption: 'Ahí nacen los errores', transition: 'swish' },
          { id: 'scene-4', narration: 'Es una herramienta útil, pero también puede engañarte.', duration: 9, visualPrompt: 'Comparación entre percepción y realidad, estilo limpio', caption: 'Útil, pero imperfecto', transition: 'fade' },
          { id: 'scene-5', narration: 'Si quieres más ciencia contada simple, sígueme.', duration: 8, visualPrompt: 'Cierre con diseño vertical minimalista y llamada a seguir', caption: 'Más ciencia simple', transition: 'fade' }
        ]
      })
    ]);

    const app = await createApp({
      jobRegistry: new JobRegistryService(),
      llmProvider,
      projectStore
    });

    const server = http.createServer(app);
    const port = await listen(server);

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/script/generate`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          projectId: project.id,
          prompt: 'Explica un sesgo del cerebro en formato corto.',
          language: 'es',
          duration: 45,
          niche: 'ciencia',
          tone: 'cercano'
        })
      });

      assert.equal(response.status, 200);
      const payload = (await response.json()) as { data: { title: string; scenes: unknown[]; hook: string } };
      assert.equal(payload.data.title, 'Cómo tu cerebro rellena huecos');
      assert.equal(payload.data.hook, 'Tu cerebro rellena huecos todo el tiempo.');
      assert.equal(payload.data.scenes.length, 5);

      const saved = JSON.parse(
        await readFile(path.join(tempRoot, project.id, 'script.json'), 'utf8')
      ) as { title: string; duration: number; scenes: unknown[] };

      assert.equal(saved.title, 'Cómo tu cerebro rellena huecos');
      assert.equal(saved.duration, 45);
      assert.equal(saved.scenes.length, 5);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
