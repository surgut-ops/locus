import type { FastifyRequest } from 'fastify';

import { LoggerService } from './logger.service.js';

export class ErrorTrackingService {
  private readonly logger = new LoggerService('error-tracking');

  public track(error: unknown, request?: FastifyRequest): void {
    const normalized = this.normalizeError(error);
    this.logger.error('Unhandled error', {
      requestId: request?.id ?? null,
      userId: this.resolveUserId(request),
      method: request?.method ?? null,
      path: request?.url ?? null,
      name: normalized.name,
      message: normalized.message,
      stack: normalized.stack,
    });
  }

  private normalizeError(error: unknown): { name: string; message: string; stack: string } {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack ?? '',
      };
    }
    return {
      name: 'UnknownError',
      message: typeof error === 'string' ? error : 'Unknown error',
      stack: '',
    };
  }

  private resolveUserId(request?: FastifyRequest): string | null {
    if (!request) {
      return null;
    }
    const headerUserId = request.headers['x-user-id'];
    if (typeof headerUserId === 'string') {
      return headerUserId;
    }
    const requestUser = request.user;
    if (requestUser && typeof requestUser.id === 'string') {
      return requestUser.id;
    }
    return null;
  }
}
