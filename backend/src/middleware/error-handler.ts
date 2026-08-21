import type { NextFunction, Request, Response } from 'express';

import { logger } from '../lib/logger.js';

export function notFoundHandler(_request: Request, response: Response): void {
  response.status(404).json({
    message: 'Recurso no encontrado.'
  });
}

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction): void {
  const message = error instanceof Error ? error.message : 'Error interno del servidor.';
  const statusCode = message.includes('no encontrado') ? 404 : 400;

  logger.error('Request failed', {
    message,
    stack: error instanceof Error ? error.stack : undefined
  });

  response.status(statusCode).json({
    message
  });
}
