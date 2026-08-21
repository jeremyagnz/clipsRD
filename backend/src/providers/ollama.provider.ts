import type { LlmGenerateInput, LlmProvider } from '../../../shared/index.js';

interface OllamaGenerateResponse {
  readonly response?: unknown;
  readonly error?: unknown;
}

export class OllamaProvider implements LlmProvider {
  readonly name = 'ollama';

  constructor(
    private readonly baseUrl: string,
    private readonly model: string
  ) {}

  async generateText(input: LlmGenerateInput): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        prompt: input.prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: input.temperature ?? 0.3
        }
      }),
      signal: AbortSignal.timeout(120_000)
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Ollama devolvió un error (${response.status}): ${details || 'sin detalle'}`);
    }

    const payload = (await response.json()) as OllamaGenerateResponse;

    if (typeof payload.response !== 'string' || payload.response.trim().length === 0) {
      const errorDetail = typeof payload.error === 'string' ? payload.error : 'respuesta vacía';
      throw new Error(`Ollama no devolvió texto utilizable: ${errorDetail}`);
    }

    return payload.response;
  }
}
