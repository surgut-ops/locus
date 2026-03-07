import type { FastifyReply, FastifyRequest } from 'fastify';

import { requireAuthenticatedUser } from '../../utils/auth.js';
import { PaymentsService } from './payments.service.js';
import { PaymentsError } from './payments.types.js';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: string | Buffer;
  }
}

export class PaymentsController {
  public constructor(private readonly service: PaymentsService) {}

  public async createPayment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const actor = requireAuthenticatedUser(request);
      const payment = await this.service.createPayment(actor, request.body);
      return reply.code(201).send(payment);
    } catch (error) {
      return reply
        .code(resolveStatus(error))
        .send({ message: error instanceof Error ? error.message : 'Failed to create payment' });
    }
  }

  public async webhook(request: FastifyRequest, reply: FastifyReply) {
    try {
      const signature = request.headers['x-yookassa-signature'];
      const webhookSignature = Array.isArray(signature) ? signature[0] : signature;
      const result = await this.service.processWebhook(request.rawBody, webhookSignature);
      return reply.send(result);
    } catch (error) {
      return reply
        .code(resolveStatus(error))
        .send({ message: error instanceof Error ? error.message : 'Webhook handling failed' });
    }
  }

  public async getMyPayments(request: FastifyRequest, reply: FastifyReply) {
    try {
      const actor = requireAuthenticatedUser(request);
      const payments = await this.service.getMyPayments(actor);
      return reply.send(payments);
    } catch (error) {
      return reply
        .code(resolveStatus(error))
        .send({ message: error instanceof Error ? error.message : 'Failed to load payment history' });
    }
  }
}

function resolveStatus(error: unknown): number {
  if (error instanceof PaymentsError) {
    return error.statusCode;
  }
  return 500;
}
