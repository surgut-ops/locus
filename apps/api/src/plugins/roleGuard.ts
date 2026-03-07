import { UserRole } from '@prisma/client';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';

import { AuthError, requireAuthenticatedUser } from '../utils/auth.js';

export function roleGuard(allowedRoles: UserRole[]): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = requireAuthenticatedUser(request);
    if (!allowedRoles.includes(user.role)) {
      const error = new AuthError('Forbidden: insufficient role', 403);
      return reply.code(error.statusCode).send({ message: error.message });
    }
  };
}

export function adminOrModeratorGuard(): preHandlerHookHandler {
  return roleGuard([UserRole.ADMIN, UserRole.MODERATOR]);
}

export function adminOnlyGuard(): preHandlerHookHandler {
  return roleGuard([UserRole.ADMIN]);
}
