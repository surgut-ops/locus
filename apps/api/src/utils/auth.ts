import { UserRole } from '@prisma/client';
import type { FastifyRequest } from 'fastify';

export type AuthenticatedUser = {
  id: string;
  role: UserRole;
};

export class AuthError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export function requireAuthenticatedUser(request: FastifyRequest): AuthenticatedUser {
  const actor = getAuthenticatedUser(request);
  if (actor) {
    return actor;
  }
  throw new AuthError('Authentication required', 401);
}

export function getAuthenticatedUser(request: FastifyRequest): AuthenticatedUser | null {
  if (request.user) {
    return request.user;
  }

  const query = (request.query ?? {}) as Record<string, unknown>;
  const userId =
    (typeof request.headers['x-user-id'] === 'string' && request.headers['x-user-id']) ||
    (typeof query.userId === 'string' && query.userId) ||
    undefined;
  const role =
    (typeof request.headers['x-user-role'] === 'string' && request.headers['x-user-role']) ||
    (typeof query.userRole === 'string' && query.userRole) ||
    undefined;

  if (typeof userId !== 'string' || typeof role !== 'string') {
    return null;
  }

  if (!Object.values(UserRole).includes(role as UserRole)) {
    throw new AuthError('Invalid user role', 401);
  }

  return {
    id: userId,
    role: role as UserRole,
  };
}

export function assertModeratorOrAdmin(user: AuthenticatedUser): void {
  if (user.role !== UserRole.MODERATOR && user.role !== UserRole.ADMIN) {
    throw new AuthError('Moderator or admin role required', 403);
  }
}
