import compress from '@fastify/compress';
import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { CacheService } from './cache/cache.service.js';
import { CDNService } from './cdn/cdn.service.js';
import { ErrorTrackingService } from './logging/error-tracking.service.js';
import { LoggerService } from './logging/logger.service.js';
import { MonitoringService } from './monitoring/monitoring.service.js';
import { RateLimitService, resolveRateLimitByPath } from './monitoring/rate-limit.service.js';
import { initializeQueueService } from './queue/queue.service.js';

type InfrastructureModuleOptions = {
  prisma: PrismaClient;
};

declare module 'fastify' {
  interface FastifyRequest {
    startedAtMs?: number;
  }
}

export async function registerInfrastructureModule(
  fastify: FastifyInstance,
  options: InfrastructureModuleOptions,
): Promise<void> {
  const logger = new LoggerService('infrastructure');
  const queueService = initializeQueueService();
  const cacheService = new CacheService();
  const cdnService = new CDNService();
  const rateLimitService = new RateLimitService();
  const monitoringService = new MonitoringService();
  const errorTracking = new ErrorTrackingService();

  await fastify.register(compress, {
    global: true,
    encodings: ['gzip', 'deflate', 'br'],
  });

  fastify.decorate('infra', {
    queueService,
    cacheService,
    cdnService,
    monitoringService,
  });

  fastify.addHook('onRequest', async (request, reply) => {
    request.startedAtMs = Date.now();
    if (request.method === 'OPTIONS') return;
    const routePath = request.routeOptions?.url ?? request.url;
    const limit = resolveRateLimitByPath(routePath);
    if (!limit) {
      return;
    }
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
    const key = `rate-limit:${request.method}:${routePath}:${String(ip)}`;
    const checked = await rateLimitService.checkLimit(key, limit.limit, limit.windowSeconds);
    if (!checked.allowed) {
      reply.code(429).send({ message: 'Rate limit exceeded. Please retry later.' });
    }
  });

  fastify.addHook('onResponse', async (request, reply) => {
    if (request.method === 'OPTIONS') return;
    const startedAt = request.startedAtMs ?? Date.now();
    const elapsedMs = Date.now() - startedAt;
    const routePath = request.routeOptions?.url ?? request.url;
    monitoringService.recordResponse(routePath, elapsedMs, reply.statusCode);
    const userIdHeader = request.headers['x-user-id'];
    const userId = typeof userIdHeader === 'string' ? userIdHeader : undefined;
    await monitoringService.markActiveUser(userId);

    // Production request logging (skip health checks to reduce noise)
    if (process.env.NODE_ENV === 'production' && !routePath.startsWith('/health')) {
      const meta = {
        requestId: request.id,
        method: request.method,
        path: routePath,
        statusCode: reply.statusCode,
        durationMs: elapsedMs,
        userId: userId ?? undefined,
      };
      if (reply.statusCode >= 500) logger.error('Request', meta);
      else if (reply.statusCode >= 400) logger.warn('Request', meta);
      else logger.info('Request', meta);
    }
  });

  fastify.setErrorHandler((error: unknown, request, reply) => {
    errorTracking.track(error, request);
    logger.error('Request failed', {
      requestId: request.id,
      method: request.method,
      path: request.url,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    const statusCode = Number((error as { statusCode?: number }).statusCode ?? 500);
    const message = statusCode >= 500 ? 'Internal server error' : (error instanceof Error ? error.message : String(error));
    try {
      reply.code(statusCode).send({ status: 'error', code: statusCode, message });
    } catch (sendErr) {
      logger.error('Error sending error response', { err: sendErr });
    }
  });

  /** Instant 200 for Railway/load balancer healthcheck - no DB/Redis calls */
  fastify.get('/live', async (_request, reply) => {
    return reply.code(200).send({ status: 'ok' });
  });

  fastify.get('/', async (_request, reply) => {
    return reply.code(200).send('LOCUS API running');
  });

  fastify.get('/health', async (_request, reply) => {
    const [databaseStatus, redisStatus, queueStatus] = await Promise.all([
      checkDatabase(options.prisma),
      queueService ? queueService.isRedisConnected() : Promise.resolve(false),
      queueService ? queueService.getQueueHealth() : Promise.resolve({}),
    ]);

    return reply.code(200).send({
      status: databaseStatus && redisStatus ? 'ok' : 'degraded',
      service: 'locus-api',
      database: databaseStatus ? 'up' : 'down',
      redis: redisStatus ? 'up' : 'down',
      queues: queueStatus,
      deploymentTargets: {
        frontend: 'Vercel',
        backend: 'Railway',
        database: 'Neon',
        cache: 'Upstash Redis',
      },
    });
  });

  fastify.get('/monitoring/metrics', async (_request, reply) => {
    const snapshot = await monitoringService.snapshot(queueService);
    return reply.code(200).send(snapshot);
  });

  logger.info('Infrastructure module initialized', {
    features: [
      'compression',
      'rate-limiting',
      'health-check',
      'monitoring',
      'structured-logging',
      'queue-bootstrap',
    ],
  });
}

async function checkDatabase(prisma: PrismaClient): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
