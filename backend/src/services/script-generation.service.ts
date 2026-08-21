import { logger } from '../lib/logger.js';
import type { ProjectStoreService } from './project-store.service.js';

import type {
  HookOption,
  HookTechnique,
  LlmProvider,
  ProjectScript,
  ScriptGenerationInput,
  ScriptScene,
  SupportedScriptDuration
} from '../../../shared/index.js';

const ALLOWED_HOOK_TECHNIQUES: readonly HookTechnique[] = [
  'curiosidad',
  'pregunta inesperada',
  'afirmación sorprendente pero verificable',
  'contraste',
  'open loop',
  'descubrimiento',
  'historia incompleta'
] as const;

const WORDS_PER_MINUTE_BY_LANGUAGE: Readonly<Record<string, number>> = {
  es: 145,
  español: 145,
  spanish: 145,
  en: 150,
  english: 150,
  pt: 145,
  portuguese: 145
};

interface HookGenerationResult {
  readonly hooks: HookOption[];
  readonly selectedHookId: string;
}

interface ValidatedScriptDraft {
  readonly title: string;
  readonly topic: string;
  readonly hook: string;
  readonly script: string;
  readonly cta: string;
  readonly scenes: ScriptScene[];
}

function stripCodeFences(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/iu, '')
    .replace(/\s*```$/u, '')
    .trim();
}

function extractJsonCandidate(value: string): string {
  const normalized = stripCodeFences(value);
  const firstObject = normalized.indexOf('{');
  const lastObject = normalized.lastIndexOf('}');

  if (firstObject !== -1 && lastObject !== -1 && lastObject > firstObject) {
    return normalized.slice(firstObject, lastObject + 1);
  }

  const firstArray = normalized.indexOf('[');
  const lastArray = normalized.lastIndexOf(']');

  if (firstArray !== -1 && lastArray !== -1 && lastArray > firstArray) {
    return normalized.slice(firstArray, lastArray + 1);
  }

  return normalized;
}

function normalizeJsonString(value: string): string {
  return extractJsonCandidate(value)
    .replace(/[\u201C\u201D]/gu, '"')
    .replace(/[\u2018\u2019]/gu, "'")
    .replace(/,\s*([}\]])/gu, '$1')
    .trim();
}

function parseJsonCandidate(value: string): unknown | null {
  const candidate = normalizeJsonString(value);

  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    return null;
  }
}

function ensureObject(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}

function ensureNonEmptyString(value: unknown, message: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(message);
  }

  return value.trim();
}

function ensureFiniteNumber(value: unknown, message: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(message);
  }

  return value;
}

function normalizeHookTechnique(value: unknown): HookTechnique {
  const normalized = ensureNonEmptyString(value, 'Cada hook debe incluir una técnica válida.').toLowerCase();
  const matched = ALLOWED_HOOK_TECHNIQUES.find((technique) => technique.toLowerCase() === normalized);

  if (!matched) {
    throw new Error('El hook usa una técnica de retención no permitida.');
  }

  return matched;
}

function validateHooksPayload(value: unknown): HookGenerationResult {
  const payload = ensureObject(value, 'La respuesta de hooks debe ser un objeto JSON.');
  const hooksValue = payload.hooks;

  if (!Array.isArray(hooksValue) || hooksValue.length < 5) {
    throw new Error('Se esperaban al menos 5 hooks.');
  }

  const hooks = hooksValue.slice(0, 5).map((entry, index) => {
    const hook = ensureObject(entry, 'Cada hook debe ser un objeto.');

    return {
      id: `hook-${index + 1}`,
      text: ensureNonEmptyString(hook.text, 'Cada hook debe incluir texto.'),
      technique: normalizeHookTechnique(hook.technique),
      score: Math.max(0, Math.min(100, ensureFiniteNumber(hook.score, 'Cada hook debe incluir score numérico.'))),
      rationale: ensureNonEmptyString(hook.rationale, 'Cada hook debe incluir rationale.')
    } satisfies HookOption;
  });

  const uniqueTexts = new Set(hooks.map((hook) => hook.text.toLowerCase()));
  if (uniqueTexts.size !== hooks.length) {
    throw new Error('Los hooks deben ser diferentes entre sí.');
  }

  const selectedHookId = ensureSelectedHookId(payload.selectedHookId, hooks);
  return { hooks, selectedHookId };
}

function ensureSelectedHookId(value: unknown, hooks: HookOption[]): string {
  if (typeof value === 'string') {
    const matched = hooks.find((hook) => hook.id === value.trim());
    if (matched) {
      return matched.id;
    }
  }

  return [...hooks].sort((left, right) => right.score - left.score)[0]?.id ?? hooks[0]!.id;
}

function validateScenes(value: unknown): ScriptScene[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('El guion debe incluir al menos una escena.');
  }

  return value.map((entry, index) => {
    const scene = ensureObject(entry, 'Cada escena debe ser un objeto.');
    return {
      id: ensureNonEmptyString(scene.id, 'Cada escena debe incluir id.'),
      narration: ensureNonEmptyString(scene.narration, 'Cada escena debe incluir narración.'),
      duration: Math.max(1, Math.round(ensureFiniteNumber(scene.duration, 'Cada escena debe incluir duración.'))),
      visualPrompt: ensureNonEmptyString(scene.visualPrompt, 'Cada escena debe incluir visualPrompt.'),
      caption: ensureNonEmptyString(scene.caption, 'Cada escena debe incluir caption.'),
      transition: ensureNonEmptyString(scene.transition, 'Cada escena debe incluir transition.')
    } satisfies ScriptScene;
  }).map((scene, index) => ({
    ...scene,
    id: scene.id || `scene-${index + 1}`
  }));
}

function validateScriptPayload(value: unknown, selectedHook: HookOption): ValidatedScriptDraft {
  const payload = ensureObject(value, 'La respuesta de guion debe ser un objeto JSON.');
  const scenes = validateScenes(payload.scenes);
  const script = ensureNonEmptyString(payload.script, 'El guion debe incluir script.');

  return {
    title: ensureNonEmptyString(payload.title, 'El guion debe incluir title.'),
    topic: ensureNonEmptyString(payload.topic, 'El guion debe incluir topic.'),
    hook: selectedHook.text,
    script,
    cta: ensureNonEmptyString(payload.cta, 'El guion debe incluir cta.'),
    scenes
  };
}

function countWords(value: string): number {
  const matches = value.trim().match(/\S+/gu);
  return matches?.length ?? 0;
}

export function estimateDurationSeconds(script: string, language: string): number {
  const normalizedLanguage = language.trim().toLowerCase();
  const wordsPerMinute = WORDS_PER_MINUTE_BY_LANGUAGE[normalizedLanguage] ?? 145;
  const words = countWords(script);

  if (words === 0) {
    return 0;
  }

  return Math.max(1, Math.round((words / wordsPerMinute) * 60));
}

function isDurationWithinTolerance(requestedDuration: SupportedScriptDuration, estimatedDuration: number): boolean {
  const tolerance = requestedDuration <= 45 ? 8 : 12;
  return Math.abs(requestedDuration - estimatedDuration) <= tolerance;
}

export class ScriptGenerationService {
  constructor(
    private readonly projectStore: ProjectStoreService,
    private readonly llmProvider: LlmProvider
  ) {}

  async generate(input: ScriptGenerationInput): Promise<ProjectScript> {
    const hooksResult = await this.generateHooks(input);
    const selectedHook = hooksResult.hooks.find((hook) => hook.id === hooksResult.selectedHookId) ?? hooksResult.hooks[0]!;
    const draft = await this.generateScriptDraft(input, selectedHook);
    const estimatedDuration = estimateDurationSeconds(draft.script, input.language);

    if (!isDurationWithinTolerance(input.duration, estimatedDuration)) {
      throw new Error(
        `El guion generado no se ajusta a la duración solicitada. Esperado: ${input.duration}s, estimado: ${estimatedDuration}s.`
      );
    }

    const script: ProjectScript = {
      projectId: input.projectId,
      title: draft.title,
      topic: draft.topic,
      prompt: input.prompt,
      language: input.language,
      duration: input.duration,
      niche: input.niche,
      tone: input.tone,
      hook: selectedHook.text,
      script: draft.script,
      estimatedDuration,
      scenes: draft.scenes,
      cta: draft.cta,
      hookOptions: hooksResult.hooks,
      selectedHookId: selectedHook.id,
      updatedAt: new Date().toISOString()
    };

    await this.projectStore.saveScript(input.projectId, script);
    return script;
  }

  private async generateHooks(input: ScriptGenerationInput): Promise<HookGenerationResult> {
    const prompt = [
      'Eres un estratega experto en contenido corto vertical.',
      'Genera exactamente 5 hooks distintos en formato JSON puro.',
      'Usa técnicas legítimas de retención y asigna una técnica distinta o claramente diversa cuando sea posible.',
      `Técnicas permitidas: ${ALLOWED_HOOK_TECHNIQUES.join(', ')}.`,
      'No utilices afirmaciones falsas presentadas como hechos, miedo extremo, amenazas, desinformación, clickbait engañoso ni contenido que viole políticas de TikTok.',
      'Los hooks deben ser breves, naturales y narrables.',
      'Devuelve este esquema JSON exacto:',
      '{"hooks":[{"text":"","technique":"","score":0,"rationale":""}],"selectedHookId":"hook-1"}',
      `Idioma: ${input.language}.`,
      `Duración objetivo: ${input.duration} segundos.`,
      `Nicho: ${input.niche}.`,
      `Tono: ${input.tone}.`,
      `Brief: ${input.prompt}`
    ].join('\n');

    return this.generateStructuredJson(prompt, 'hooks', validateHooksPayload, 0.8);
  }

  private async generateScriptDraft(input: ScriptGenerationInput, selectedHook: HookOption): Promise<ValidatedScriptDraft> {
    const prompt = [
      'Eres un guionista experto en videos cortos verticales.',
      'Responde con JSON puro y válido.',
      'Usa el hook seleccionado como primera línea o idea de apertura principal.',
      'El guion debe tener frases cortas, sonar natural al narrarse, tener ritmo, evitar introducciones innecesarias, incluir cambios de ritmo y cerrar con una CTA natural.',
      'Adapta el guion a la duración pedida usando narración hablada realista.',
      'Cada escena debe incluir id, narration, duration, visualPrompt, caption y transition.',
      'Devuelve este esquema JSON exacto:',
      '{"title":"","topic":"","hook":"","script":"","cta":"","scenes":[{"id":"scene-1","narration":"","duration":0,"visualPrompt":"","caption":"","transition":""}]}',
      `Idioma: ${input.language}.`,
      `Duración objetivo: ${input.duration} segundos.`,
      `Nicho: ${input.niche}.`,
      `Tono: ${input.tone}.`,
      `Hook seleccionado: ${selectedHook.text}`,
      `Brief: ${input.prompt}`
    ].join('\n');

    return this.generateStructuredJson(prompt, 'guion', (value) => validateScriptPayload(value, selectedHook), 0.6);
  }

  private async generateStructuredJson<T>(
    prompt: string,
    schemaName: string,
    validator: (value: unknown) => T,
    temperature: number
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const raw = await this.llmProvider.generateText({ prompt, temperature });
      const parsed = parseJsonCandidate(raw);

      if (parsed !== null) {
        try {
          return validator(parsed);
        } catch (error) {
          lastError = error;
        }
      }

      try {
        const repaired = await this.repairJson(raw, schemaName);
        return validator(repaired);
      } catch (error) {
        lastError = error;
        logger.warn('Invalid structured JSON from LLM', {
          provider: this.llmProvider.name,
          schemaName,
          attempt,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }

    throw new Error(
      `No se pudo obtener un ${schemaName} válido desde ${this.llmProvider.name}: ${
        lastError instanceof Error ? lastError.message : 'error desconocido'
      }`
    );
  }

  private async repairJson(raw: string, schemaName: string): Promise<unknown> {
    const prompt = [
      'Repara el siguiente JSON para que sea JSON válido.',
      'No cambies el significado. No añadas texto fuera del JSON.',
      `El esquema esperado corresponde a: ${schemaName}.`,
      'Devuelve únicamente JSON válido.',
      raw
    ].join('\n\n');

    const repairedRaw = await this.llmProvider.generateText({ prompt, temperature: 0 });
    const repaired = parseJsonCandidate(repairedRaw);

    if (repaired === null) {
      throw new Error('La reparación no produjo JSON válido.');
    }

    return repaired;
  }
}
