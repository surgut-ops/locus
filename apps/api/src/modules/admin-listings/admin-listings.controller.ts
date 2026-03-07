import type { FastifyInstance, FastifyReply } from 'fastify';

import { AuthError, requireAuthenticatedUser } from '../../utils/auth.js';
import { AdminListingsError, AdminListingsService } from './admin-listings.service.js';

type ListingParams = {
  id: string;
};

export async function registerAdminListingsController(
  fastify: FastifyInstance,
  service: AdminListingsService,
): Promise<void> {
  fastify.get('/admin/listings/pending', async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      const listings = await service.getPendingListings(actor);
      return reply.code(200).send(listings);
    } catch (error) {
      return handleAdminListingsError(reply, error);
    }
  });

  fastify.put<{ Params: ListingParams }>('/admin/listings/:id/approve', async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      const listing = await service.approveListing(actor, request.params.id);
      return reply.code(200).send(listing);
    } catch (error) {
      return handleAdminListingsError(reply, error);
    }
  });

  fastify.put<{ Params: ListingParams }>('/admin/listings/:id/reject', async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      const listing = await service.rejectListing(actor, request.params.id);
      return reply.code(200).send(listing);
    } catch (error) {
      return handleAdminListingsError(reply, error);
    }
  });
}

function handleAdminListingsError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  if (error instanceof AdminListingsError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}
