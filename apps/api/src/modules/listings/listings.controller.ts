import { type FastifyReply, type FastifyRequest } from 'fastify';

import { getQueueService } from '../infrastructure/queue/queue.service.js';
import type { ModerationService } from '../moderation/moderation.service.js';
import type { RecommendationsService } from '../recommendations/recommendations.service.js';
import { AuthError, getAuthenticatedUser, requireAuthenticatedUser } from '../../utils/auth.js';
import { ListingsService } from './listings.service.js';
import { ListingsError } from './listings.types.js';

type ListingIdParams = {
  id: string;
};

type UserIdParams = {
  id: string;
};

export class ListingsController {
  public constructor(
    private readonly service: ListingsService,
    private readonly recommendationsService?: RecommendationsService,
    private readonly moderationService?: ModerationService,
  ) {}

  public async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const actor = requireAuthenticatedUser(request);
      const created = await this.service.createListing(actor, request.body);
      const queueService = getQueueService();
      if (queueService) {
        await queueService.addSearchIndexJob({ action: 'indexListing', listingId: created.id });
        await queueService.addAIProcessingJob({
          task: 'generateEmbeddings',
          listingId: created.id,
        });
        await queueService.addAIProcessingJob({
          task: 'runModeration',
          listingId: created.id,
        });
      }
      return reply.code(201).send(created);
    } catch (error) {
      return handleListingsError(reply, error);
    }
  }

  public async getById(
    request: FastifyRequest<{ Params: ListingIdParams }>,
    reply: FastifyReply,
  ) {
    try {
      const listing = await this.service.getListingById(request.params.id);
      const actor = getAuthenticatedUser(request);
      if (actor && this.recommendationsService) {
        await this.recommendationsService.trackListingView(actor.id, request.params.id);
      }
      return reply.code(200).send(listing);
    } catch (error) {
      return handleListingsError(reply, error);
    }
  }

  public async update(
    request: FastifyRequest<{ Params: ListingIdParams }>,
    reply: FastifyReply,
  ) {
    try {
      const actor = requireAuthenticatedUser(request);
      const updated = await this.service.updateListing(actor, request.params.id, request.body);
      const queueService = getQueueService();
      if (queueService) {
        await queueService.addSearchIndexJob({ action: 'updateListing', listingId: updated.id });
        await queueService.addAIProcessingJob({
          task: 'generateEmbeddings',
          listingId: updated.id,
        });
      }
      return reply.code(200).send(updated);
    } catch (error) {
      return handleListingsError(reply, error);
    }
  }

  public async archive(
    request: FastifyRequest<{ Params: ListingIdParams }>,
    reply: FastifyReply,
  ) {
    try {
      const actor = requireAuthenticatedUser(request);
      const archived = await this.service.archiveListing(actor, request.params.id);
      const queueService = getQueueService();
      if (queueService) {
        await queueService.addSearchIndexJob({ action: 'removeListing', listingId: archived.id });
      }
      return reply.code(200).send(archived);
    } catch (error) {
      return handleListingsError(reply, error);
    }
  }

  public async getMyListings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const actor = requireAuthenticatedUser(request);
      const q = request.query as { limit?: string; offset?: string };
      const limit = q.limit ? Math.min(parseInt(q.limit, 10) || 50, 100) : 50;
      const offset = Math.max(0, parseInt(q.offset ?? '0', 10) || 0);
      const listings = await this.service.getMyListings(actor, limit, offset);
      return reply.code(200).send(listings);
    } catch (error) {
      return handleListingsError(reply, error);
    }
  }

  public async getByUserId(
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply,
  ) {
    try {
      const q = request.query as { limit?: string; offset?: string };
      const limit = q.limit ? Math.min(parseInt(q.limit, 10) || 50, 100) : 50;
      const offset = Math.max(0, parseInt(q.offset ?? '0', 10) || 0);
      const listings = await this.service.getHostListingsByUserId(request.params.id, limit, offset);
      return reply.code(200).send(listings);
    } catch (error) {
      return handleListingsError(reply, error);
    }
  }
}

function handleListingsError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  if (error instanceof ListingsError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}
