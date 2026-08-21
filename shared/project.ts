export type ProjectStatus =
  | 'draft'
  | 'queued'
  | 'processing'
  | 'rendering'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type GenerationStage =
  | 'idea-analysis'
  | 'hook-generation'
  | 'script-generation'
  | 'scene-planning'
  | 'visual-prompts'
  | 'image-generation'
  | 'voice-generation'
  | 'subtitle-generation'
  | 'music-selection'
  | 'composition'
  | 'render';

export type SupportedScriptDuration = 30 | 45 | 60 | 90;

export type HookTechnique =
  | 'curiosidad'
  | 'pregunta inesperada'
  | 'afirmación sorprendente pero verificable'
  | 'contraste'
  | 'open loop'
  | 'descubrimiento'
  | 'historia incompleta';

export interface ProjectPaths {
  readonly audio: string;
  readonly images: string;
  readonly subtitles: string;
  readonly music: string;
  readonly renders: string;
  readonly final: string;
}

export interface VideoProject {
  readonly id: string;
  readonly title: string;
  readonly idea: string;
  readonly durationSeconds: number;
  readonly aspectRatio: '9:16';
  readonly status: ProjectStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly paths: ProjectPaths;
}

export interface HookOption {
  readonly id: string;
  readonly text: string;
  readonly technique: HookTechnique;
  readonly score: number;
  readonly rationale: string;
}

export interface ScriptScene {
  readonly id: string;
  readonly narration: string;
  readonly duration: number;
  readonly visualPrompt: string;
  readonly caption: string;
  readonly transition: string;
}

export interface ProjectScript {
  readonly projectId: string;
  readonly title: string;
  readonly topic: string;
  readonly prompt: string;
  readonly language: string;
  readonly duration: SupportedScriptDuration;
  readonly niche: string;
  readonly tone: string;
  readonly hook: string;
  readonly script: string;
  readonly estimatedDuration: number;
  readonly scenes: ScriptScene[];
  readonly cta: string;
  readonly hookOptions: HookOption[];
  readonly selectedHookId: string | null;
  readonly updatedAt: string;
}

export interface CreateProjectInput {
  readonly idea: string;
  readonly title?: string;
  readonly durationSeconds?: number;
}

export interface ScriptGenerationInput {
  readonly projectId: string;
  readonly prompt: string;
  readonly language: string;
  readonly duration: SupportedScriptDuration;
  readonly niche: string;
  readonly tone: string;
}

export interface GenerationJob {
  readonly id: string;
  readonly projectId: string;
  readonly stage: GenerationStage;
  readonly progress: number;
  readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly errorMessage?: string;
}
