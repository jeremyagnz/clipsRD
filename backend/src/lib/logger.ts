export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

function write(level: LogLevel, message: string, details?: unknown): void {
  const timestamp = new Date().toISOString();
  const payload = details === undefined ? '' : ` ${JSON.stringify(details)}`;
  const line = `[${timestamp}] [${level}] ${message}${payload}`;

  if (level === 'ERROR') {
    console.error(line);
    return;
  }

  console.log(line);
}

export const logger = {
  info: (message: string, details?: unknown) => write('INFO', message, details),
  warn: (message: string, details?: unknown) => write('WARN', message, details),
  error: (message: string, details?: unknown) => write('ERROR', message, details)
};
