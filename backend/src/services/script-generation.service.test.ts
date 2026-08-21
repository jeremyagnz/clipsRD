import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import type { LlmGenerateInput, LlmProvider } from '../../../shared/index.js';

import { ProjectStoreService } from './project-store.service.js';
import { ScriptGenerationService, estimateDurationSeconds } from './script-generation.service.js';

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

test('estimateDurationSeconds usa una referencia realista para español hablado', () => {
  const script = Array.from({ length: 145 }, () => 'palabra').join(' ');
  assert.equal(estimateDurationSeconds(script, 'es'), 60);
});

test('ScriptGenerationService repara hooks inválidos y guarda el guion final', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'clipsrd-script-service-'));

  try {
    const projectStore = new ProjectStoreService(tempRoot);
    await projectStore.ensureReady();
    const project = await projectStore.createProject({
      idea: 'Explica un hallazgo curioso del océano en formato corto.',
      durationSeconds: 60
    });

    const hookPayload = JSON.stringify({
      hooks: [
        { text: 'El océano esconde una ciudad que nadie esperaba.', technique: 'curiosidad', score: 86, rationale: 'Abre un misterio verificable.' },
        { text: '¿Qué harías si el fondo del mar respondiera?', technique: 'pregunta inesperada', score: 79, rationale: 'Invita a seguir escuchando.' },
        { text: 'Hay lugares del océano más desconocidos que la Luna.', technique: 'afirmación sorprendente pero verificable', score: 91, rationale: 'Sorprende sin mentir.' },
        { text: 'Arriba todo parece calma; abajo cambia por completo.', technique: 'contraste', score: 74, rationale: 'Genera contraste visual.' },
        { text: 'Lo más raro aparece justo cuando crees que ya viste todo.', technique: 'open loop', score: 82, rationale: 'Deja una pregunta abierta.' }
      ],
      selectedHookId: 'hook-3'
    }, null, 2);

    const scriptPayload = JSON.stringify({
      title: 'El océano todavía guarda sorpresas',
      topic: 'misterios del océano',
      hook: 'Hay lugares del océano más desconocidos que la Luna.',
      script: 'Hay lugares del océano más desconocidos que la Luna. Y no es exageración. Apenas exploramos una parte mínima del fondo marino. Eso significa que la mayor parte del mapa real sigue incompleto. Cada inmersión profunda revela especies extrañas, paisajes imposibles y señales que todavía intentamos entender. A veces aparece una criatura nueva. Otras veces, una formación que obliga a revisar teorías enteras. También surgen sonidos, movimientos y patrones que tardan años en explicarse. Lo más fascinante es que muchas respuestas siguen allá abajo, fuera de nuestra vista diaria. Por eso cada descubrimiento cambia lo que creíamos saber del planeta. Y también recuerda que todavía vivimos rodeados de misterio, aunque miremos el mar todos los días. Si te sorprendió, sigue la cuenta para más historias reales del océano.',
      cta: 'Si te sorprendió, sigue la cuenta para más historias reales del océano.',
      scenes: [
        { id: 'scene-1', narration: 'Hay lugares del océano más desconocidos que la Luna.', duration: 10, visualPrompt: 'Plano submarino profundo con tonos azules y sensación de misterio', caption: 'Más desconocido que la Luna', transition: 'cut' },
        { id: 'scene-2', narration: 'Apenas exploramos una parte mínima del fondo marino.', duration: 12, visualPrompt: 'Mapa del océano iluminando una pequeña zona explorada', caption: 'Exploramos muy poco', transition: 'swish' },
        { id: 'scene-3', narration: 'Cada inmersión profunda revela especies extrañas y paisajes imposibles.', duration: 14, visualPrompt: 'Criaturas abisales y formaciones marinas extrañas, estilo documental', caption: 'Siempre aparece algo nuevo', transition: 'zoom' },
        { id: 'scene-4', narration: 'Muchas respuestas siguen allá abajo.', duration: 10, visualPrompt: 'Oscuridad oceánica con luz de submarino buscando señales', caption: 'El misterio sigue abierto', transition: 'fade' },
        { id: 'scene-5', narration: 'Si te sorprendió, sigue la cuenta para más historias reales del océano.', duration: 12, visualPrompt: 'Cierre limpio con olas y texto inspirador', caption: 'Más historias reales', transition: 'fade' }
      ]
    }, null, 2);

    const llmProvider = new SequenceLlmProvider([
      '```json\n{"hooks": [}\n```',
      hookPayload,
      scriptPayload
    ]);

    const service = new ScriptGenerationService(projectStore, llmProvider);
    const script = await service.generate({
      projectId: project.id,
      prompt: 'Crea un guion corto sobre misterios reales del océano.',
      language: 'es',
      duration: 60,
      niche: 'ciencia',
      tone: 'intrigante'
    });

    assert.equal(script.selectedHookId, 'hook-3');
    assert.equal(script.hook, 'Hay lugares del océano más desconocidos que la Luna.');
    assert.equal(script.title, 'El océano todavía guarda sorpresas');
    assert.equal(script.scenes.length, 5);
    assert.ok(script.estimatedDuration >= 48 && script.estimatedDuration <= 72);

    const savedScript = await projectStore.getScript(project.id);
    assert.equal(savedScript.title, script.title);
    assert.equal(savedScript.hookOptions.length, 5);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
