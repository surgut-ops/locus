import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance, FastifyReply } from 'fastify';

import { AuthError, requireAuthenticatedUser } from '../../utils/auth.js';
import { AIBehaviorService } from './ai.behavior.service.js';
import { AIEmbeddingService } from './ai.embedding.service.js';
import { AIRecommendationService } from './ai.recommendation.service.js';
import { AIRankingService } from './ai.ranking.service.js';
import { AIService } from './ai.service.js';
import { AIError } from './ai.types.js';

type AIModuleOptions = {
  prisma: PrismaClient;
};

export async function registerAIModule(
  fastify: FastifyInstance,
  options: AIModuleOptions,
): Promise<void> {
  const behavior = new AIBehaviorService();
  const ranking = new AIRankingService();
  const embedding = new AIEmbeddingService();
  const recommendation = new AIRecommendationService(options.prisma, behavior, ranking);
  const service = new AIService(options.prisma, behavior, recommendation, ranking, embedding);

  fastify.post('/events/view', async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      const result = await service.trackListingView(actor, request.body);
      return reply.code(200).send(result);
    } catch (error) {
      return handleAIError(reply, error);
    }
  });

  fastify.post('/events/search', async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      const result = await service.trackSearchEvent(actor, request.body);
      return reply.code(200).send(result);
    } catch (error) {
      return handleAIError(reply, error);
    }
  });

  fastify.get('/ai/recommendations', async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      const recommendations = await service.getRecommendations(actor);
      return reply.code(200).send(recommendations);
    } catch (error) {
      return handleAIError(reply, error);
    }
  });

  fastify.post('/ai/search', async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      const result = await service.aiAssistedSearch(actor, request.body);
      return reply.code(200).send(result);
    } catch (error) {
      return handleAIError(reply, error);
    }
  });

  fastify.get('/ai/trending', async (_request, reply) => {
    try {
      const result = await service.getTrending();
      return reply.code(200).send(result);
    } catch (error) {
      return handleAIError(reply, error);
    }
  });
}

function handleAIError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  if (error instanceof AIError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}
