import type { FastifyReply, FastifyRequest } from 'fastify';

import { requireAuth } from '../auth/auth.middleware.js';
import { ImportService } from './import.service.js';
import { ImportError } from './import.types.js';

export class ImportController {
  public constructor(private readonly service: ImportService) {}

  public async importCsv(
    request: FastifyRequest<{ Body: { csv?: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const actor = request.user as { id: string };
      const csv = request.body?.csv;
      if (typeof csv !== 'string' || !csv.trim()) {
        throw new ImportError('Field "csv" is required', 400);
      }
      const { jobId } = await this.service.enqueueCsv(actor.id, csv);
      return reply.code(202).send({ jobId, status: 'queued', message: 'Import job queued' });
    } catch (err) {
      return this.handleError(reply, err);
    }
  }

  public async importJson(
    request: FastifyRequest<{ Body: { items?: unknown[] } }>,
    reply: FastifyReply,
  ) {
    try {
      const actor = request.user as { id: string };
      const items = request.body?.items;
      if (!Array.isArray(items)) {
        throw new ImportError('Field "items" must be an array', 400);
      }
      const { jobId } = await this.service.enqueueJson(actor.id, items);
      return reply.code(202).send({ jobId, status: 'queued', message: 'Import job queued' });
    } catch (err) {
      return this.handleError(reply, err);
    }
  }

  public async importUrl(
    request: FastifyRequest<{ Body: { url?: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const actor = request.user as { id: string };
      const url = request.body?.url;
      if (typeof url !== 'string' || !url.trim() || !url.startsWith('http')) {
        throw new ImportError('Valid "url" is required', 400);
      }
      const { jobId } = await this.service.enqueueUrl(actor.id, url);
      return reply.code(202).send({ jobId, status: 'queued', message: 'Import job queued' });
    } catch (err) {
      return this.handleError(reply, err);
    }
  }

  private handleError(reply: FastifyReply, err: unknown) {
    if (err instanceof ImportError) {
      return reply.code(err.statusCode).send({ message: err.message });
    }
    throw err;
  }
}
