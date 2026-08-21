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
  readonly score: number;
}

export interface ScriptScene {
  readonly id: string;
  readonly order: number;
  readonly narration: string;
  readonly visualPrompt: string;
  readonly durationSeconds: number;
}

export interface ProjectScript {
  readonly projectId: string;
  readonly hookOptions: HookOption[];
  readonly selectedHookId: string | null;
  readonly scenes: ScriptScene[];
  readonly updatedAt: string;
}

export interface CreateProjectInput {
  readonly idea: string;
  readonly title?: string;
  readonly durationSeconds?: number;
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
