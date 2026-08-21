import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

config();

const currentDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(currentDir, '../..');
const repositoryRoot = resolve(backendRoot, '..');

function parsePort(value: string | undefined): number {
  const fallbackPort = 3000;

  if (!value) {
    return fallbackPort;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackPort;
}

export const env = {
  port: parsePort(process.env.PORT),
  corsOrigin: process.env.CORS_ORIGIN?.trim() || 'http://localhost:4200',
  projectsRoot: process.env.PROJECTS_ROOT?.trim() || resolve(repositoryRoot, 'generated/projects'),
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL?.trim() || 'http://127.0.0.1:11434',
  ollamaModel: process.env.OLLAMA_MODEL?.trim() || 'llama3.1:8b',
  piperBinaryPath: process.env.PIPER_BINARY_PATH?.trim() || '/usr/local/bin/piper',
  imageProviderMode: process.env.IMAGE_PROVIDER_MODE?.trim() || 'local'
} as const;
