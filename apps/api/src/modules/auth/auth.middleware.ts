import { UserRole } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';

import { type AuthenticatedUser } from '../../utils/auth.js';
import { type JwtClaims, AuthModuleError } from './auth.types.js';

export const requireAuth: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    request.user = parseAuthenticatedUserFromRequest(request);
  } catch (error) {
    if (error instanceof AuthModuleError) {
      return reply.code(error.statusCode).send({ message: error.message });
    }
    return reply.code(401).send({ message: 'Authentication required' });
  }
};

export function parseAuthenticatedUserFromRequest(request: FastifyRequest): AuthenticatedUser {
  const authHeader = request.headers.authorization;
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    throw new AuthModuleError('Missing or invalid Authorization header', 401);
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    throw new AuthModuleError('Missing bearer token', 401);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AuthModuleError('JWT_SECRET is missing', 500);
  }

  let payload: unknown;
  try {
    payload = jwt.verify(token, secret);
  } catch {
    throw new AuthModuleError('Invalid JWT token', 401);
  }

  if (!isObject(payload)) {
    throw new AuthModuleError('Invalid JWT payload', 401);
  }
  if (typeof payload.userId !== 'string' || !payload.userId.trim()) {
    throw new AuthModuleError('Invalid JWT payload', 401);
  }
  if (typeof payload.role !== 'string' || !isAllowedRole(payload.role)) {
    throw new AuthModuleError('Invalid JWT payload role', 401);
  }

  const claims = payload as JwtClaims;
  return {
    id: claims.userId,
    role: claims.role,
  };
}

function isAllowedRole(role: string): role is UserRole {
  return (
    role === UserRole.USER ||
    role === UserRole.HOST ||
    role === UserRole.ADMIN ||
    role === UserRole.MODERATOR
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
