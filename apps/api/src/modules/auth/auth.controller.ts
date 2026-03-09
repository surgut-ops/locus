import type { FastifyReply, FastifyRequest } from 'fastify';

import { AuthError, requireAuthenticatedUser } from '../../utils/auth.js';
import { AuthService } from './auth.service.js';
import { AuthModuleError } from './auth.types.js';

export class AuthController {
  public constructor(private readonly service: AuthService) {}

  public async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await this.service.register(request.body);
      return reply.code(201).send(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      request.log.warn({ err: error, message: msg, stack }, 'auth/register failed');
      return handleAuthModuleError(reply, error);
    }
  }

  public async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await this.service.login(request.body);
      return reply.code(200).send(result);
    } catch (error) {
      return handleAuthModuleError(reply, error);
    }
  }

  public async me(request: FastifyRequest, reply: FastifyReply) {
    try {
      const actor = requireAuthenticatedUser(request);
      const profile = await this.service.getMyProfile(actor);
      return reply.code(200).send(profile);
    } catch (error) {
      return handleAuthModuleError(reply, error);
    }
  }
}

function handleAuthModuleError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  if (error instanceof AuthModuleError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}
