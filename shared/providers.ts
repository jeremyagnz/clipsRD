export interface LlmGenerateInput {
  readonly prompt: string;
  readonly temperature?: number;
}

export interface LlmProvider {
  readonly name: string;
  generateText(input: LlmGenerateInput): Promise<string>;
}

export interface TtsSynthesisInput {
  readonly text: string;
  readonly voice: string;
  readonly outputPath: string;
}

export interface TtsProvider {
  readonly name: string;
  synthesize(input: TtsSynthesisInput): Promise<string>;
}

export interface ImageGenerationInput {
  readonly prompt: string;
  readonly outputPath: string;
  readonly width: number;
  readonly height: number;
}

export interface ImageProvider {
  readonly name: string;
  generateImage(input: ImageGenerationInput): Promise<string>;
}
