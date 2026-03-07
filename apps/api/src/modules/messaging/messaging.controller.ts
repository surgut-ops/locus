import type { FastifyInstance, FastifyReply } from 'fastify';

import { requireAuth } from '../auth/auth.middleware.js';
import { AuthError, requireAuthenticatedUser } from '../../utils/auth.js';
import { MessagingService } from './messaging.service.js';
import { MessagingError } from './messaging.types.js';

type ConversationParams = {
  id: string;
};

type MessageQuery = {
  page?: string;
  limit?: string;
};

export async function registerMessagingController(
  fastify: FastifyInstance,
  service: MessagingService,
): Promise<void> {
  fastify.post('/conversations', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      const conversation = await service.createConversation(actor, request.body);
      return reply.code(200).send(conversation);
    } catch (error) {
      return handleMessagingError(reply, error);
    }
  });

  fastify.get('/conversations', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      const conversations = await service.getUserConversations(actor);
      return reply.code(200).send(conversations);
    } catch (error) {
      return handleMessagingError(reply, error);
    }
  });

  fastify.post('/messages', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      const message = await service.sendMessage(actor, request.body);
      return reply.code(201).send(message);
    } catch (error) {
      return handleMessagingError(reply, error);
    }
  });

  fastify.get<{ Params: ConversationParams; Querystring: MessageQuery }>(
    '/conversations/:id/messages',
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const actor = requireAuthenticatedUser(request);
        const messages = await service.getMessages(actor, request.params.id, request.query);
        return reply.code(200).send(messages);
      } catch (error) {
        return handleMessagingError(reply, error);
      }
    },
  );
}

function handleMessagingError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  if (error instanceof MessagingError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}
