import type { FastifyInstance, FastifyReply } from 'fastify';

import { getQueueService } from '../infrastructure/queue/queue.service.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { adminOnlyGuard, adminOrModeratorGuard } from '../../plugins/roleGuard.js';
import { AuthError, requireAuthenticatedUser } from '../../utils/auth.js';
import { AdminError } from './admin.types.js';
import { AdminService } from './admin.service.js';

type IdParam = {
  id: string;
};

type ReportResolveBody = {
  actionTaken?: string;
};

export async function registerAdminController(
  fastify: FastifyInstance,
  service: AdminService,
): Promise<void> {
  const protectedAdmin = { preHandler: [requireAuth, adminOrModeratorGuard()] };
  const adminOnly = { preHandler: [requireAuth, adminOnlyGuard()] };

  fastify.get('/admin/stats', adminOnly, async (_request, reply) => {
    try {
      return reply.code(200).send(await service.getStats());
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });

  fastify.get('/admin/users', adminOnly, async (_request, reply) => {
    try {
      return reply.code(200).send(await service.getUsers());
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });

  fastify.get<{ Params: IdParam }>('/admin/users/:id', adminOnly, async (request, reply) => {
    try {
      return reply.code(200).send(await service.getUserById(request.params.id));
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });

  fastify.put<{ Params: IdParam }>('/admin/users/:id/block', adminOnly, async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      return reply.code(200).send(await service.blockUser(actor, request.params.id));
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });

  fastify.put<{ Params: IdParam }>('/admin/users/:id/unblock', adminOnly, async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      return reply.code(200).send(await service.unblockUser(actor, request.params.id));
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });

  fastify.get('/admin/listings', adminOnly, async (_request, reply) => {
    try {
      return reply.code(200).send(await service.getListings());
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });

  fastify.get<{ Params: IdParam }>('/admin/listings/:id', adminOnly, async (request, reply) => {
    try {
      return reply.code(200).send(await service.getListingById(request.params.id));
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });

  fastify.put<{ Params: IdParam }>('/admin/listings/:id/approve', adminOnly, async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      return reply.code(200).send(await service.moderateListing(actor, request.params.id, 'approve'));
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });

  fastify.put<{ Params: IdParam }>('/admin/listings/:id/reject', adminOnly, async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      return reply.code(200).send(await service.moderateListing(actor, request.params.id, 'reject'));
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });

  fastify.put<{ Params: IdParam }>('/admin/listings/:id/block', adminOnly, async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      return reply.code(200).send(await service.moderateListing(actor, request.params.id, 'block'));
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });

  fastify.get('/admin/bookings', adminOnly, async (_request, reply) => {
    try {
      return reply.code(200).send(await service.getBookings());
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });

  fastify.get<{ Params: IdParam }>('/admin/bookings/:id', adminOnly, async (request, reply) => {
    try {
      return reply.code(200).send(await service.getBookingById(request.params.id));
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });

  fastify.get('/admin/analytics', protectedAdmin, async (_request, reply) => {
    try {
      return reply.code(200).send(await service.getAnalytics());
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });

  fastify.post('/reports', async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      return reply.code(201).send(await service.createReport(actor, request.body));
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });

  fastify.get('/admin/reports', protectedAdmin, async (_request, reply) => {
    try {
      return reply.code(200).send(await service.getReports());
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });

  fastify.put<{ Params: IdParam; Body: ReportResolveBody }>(
    '/admin/reports/:id/resolve',
    protectedAdmin,
    async (request, reply) => {
      try {
        const actor = requireAuthenticatedUser(request);
        return reply.code(200).send(await service.resolveReport(actor, request.params.id, request.body?.actionTaken ?? null));
      } catch (error) {
        return handleAdminError(reply, error);
      }
    },
  );

  fastify.get('/admin/audit', protectedAdmin, async (_request, reply) => {
    try {
      return reply.code(200).send(await service.getAuditLog());
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });

  fastify.get('/admin/jobs', adminOnly, async (_request, reply) => {
    try {
      const queueService = getQueueService();
      if (!queueService) {
        return reply.code(200).send({ queues: [], message: 'Queue service not initialized' });
      }
      const status = await queueService.getQueueStatus();
      return reply.code(200).send({
        queues: Object.values(status),
        jobsCount: Object.values(status).reduce(
          (acc, q) => acc + (q.waiting ?? 0) + (q.active ?? 0) + (q.delayed ?? 0) + (q.failed ?? 0),
          0,
        ),
      });
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });
}

function handleAdminError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  if (error instanceof AdminError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}
