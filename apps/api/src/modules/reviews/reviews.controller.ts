import type { FastifyReply, FastifyRequest } from 'fastify';

import { AuthError, requireAuthenticatedUser } from '../../utils/auth.js';
import { ReviewsService } from './reviews.service.js';
import { ReviewsError, type ListingReviewsQuery } from './reviews.types.js';

type ListingParams = {
  id: string;
};

export class ReviewsController {
  public constructor(private readonly service: ReviewsService) {}

  public async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const actor = requireAuthenticatedUser(request);
      const review = await this.service.createReview(actor, request.body);
      return reply.code(201).send(review);
    } catch (error) {
      return handleReviewsError(reply, error);
    }
  }

  public async getByListing(
    request: FastifyRequest<{ Params: ListingParams; Querystring: ListingReviewsQuery }>,
    reply: FastifyReply,
  ) {
    try {
      const data = await this.service.getListingReviews(request.params.id, request.query);
      return reply.code(200).send(data);
    } catch (error) {
      return handleReviewsError(reply, error);
    }
  }
}

function handleReviewsError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  if (error instanceof ReviewsError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}
