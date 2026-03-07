import type { FastifyReply, FastifyRequest } from 'fastify';

import { AuthError, requireAuthenticatedUser } from '../../utils/auth.js';
import { AmenitiesService } from './amenities.service.js';
import { AmenitiesError } from './amenities.types.js';

type ListingParams = {
  id: string;
};

type ListingAmenityParams = {
  id: string;
  amenityId: string;
};

export class AmenitiesController {
  public constructor(private readonly service: AmenitiesService) {}

  public async createAmenity(request: FastifyRequest, reply: FastifyReply) {
    try {
      const actor = requireAuthenticatedUser(request);
      const amenity = await this.service.createAmenity(actor, request.body);
      return reply.code(201).send(amenity);
    } catch (error) {
      return handleAmenitiesError(reply, error);
    }
  }

  public async getAmenities(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const amenities = await this.service.getAmenities();
      return reply.code(200).send(amenities);
    } catch (error) {
      return handleAmenitiesError(reply, error);
    }
  }

  public async assignAmenities(
    request: FastifyRequest<{ Params: ListingParams }>,
    reply: FastifyReply,
  ) {
    try {
      const actor = requireAuthenticatedUser(request);
      const result = await this.service.assignAmenities(actor, request.params.id, request.body);
      return reply.code(200).send(result);
    } catch (error) {
      return handleAmenitiesError(reply, error);
    }
  }

  public async getListingAmenities(
    request: FastifyRequest<{ Params: ListingParams }>,
    reply: FastifyReply,
  ) {
    try {
      const amenities = await this.service.getListingAmenities(request.params.id);
      return reply.code(200).send(amenities);
    } catch (error) {
      return handleAmenitiesError(reply, error);
    }
  }

  public async removeAmenity(
    request: FastifyRequest<{ Params: ListingAmenityParams }>,
    reply: FastifyReply,
  ) {
    try {
      const actor = requireAuthenticatedUser(request);
      const result = await this.service.removeAmenity(actor, request.params.id, request.params.amenityId);
      return reply.code(200).send(result);
    } catch (error) {
      return handleAmenitiesError(reply, error);
    }
  }
}

function handleAmenitiesError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  if (error instanceof AmenitiesError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}
