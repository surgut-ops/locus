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
      request.log.error({ err: error, message: msg, stack }, 'auth/register failed');
      console.error('REGISTER ERROR:', msg, stack);
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
  try {
    if (error instanceof AuthError) {
      return reply.code(error.statusCode).send({
        status: 'error',
        code: error.statusCode,
        message: error.message,
      });
    }
    if (error instanceof AuthModuleError) {
      return reply.code(error.statusCode).send({
        status: 'error',
        code: error.statusCode,
        message: error.message,
      });
    }
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return reply.code(500).send({ status: 'error', code: 500, message: msg });
  } catch (sendErr) {
    console.error('handleAuthModuleError send failed:', sendErr);
    throw sendErr;
  }
}
