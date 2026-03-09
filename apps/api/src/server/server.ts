import type { PrismaClient } from '@prisma/client';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance } from 'fastify';
import rawBody from 'fastify-raw-body';

import { registerAdminModule } from '../modules/admin/admin.module.js';
import { registerAiListingModuleRoutes } from '../routes/ai-listing.routes.js';
import { registerAiSearchModuleRoutes } from '../routes/ai-search.routes.js';
import { registerAIAdvancedModule } from '../modules/ai-advanced/ai-advanced.module.js';
import { registerAIModule } from '../modules/ai/ai.module.js';
import { registerAmenitiesModule } from '../modules/amenities/amenities.module.js';
import { registerAuthModule } from '../modules/auth/auth.module.js';
import { registerReferralModuleRoutes } from '../routes/referral.routes.js';
import { registerBookingsModule } from '../modules/bookings/bookings.module.js';
import { registerGrowthModule } from '../modules/growth/growth.module.js';
import { registerHostAnalyticsModuleRoutes } from '../routes/host-analytics.routes.js';
import { registerInfrastructureModule } from '../modules/infrastructure/infrastructure.module.js';
import { registerMessagingModule } from '../modules/messaging/messaging.module.js';
import { registerPaymentsModule } from '../modules/payments/payments.module.js';
import { registerImportModuleRoutes } from '../routes/import.routes.js';
import { registerMatchModuleRoutes } from '../routes/match.routes.js';
import { registerHeatmapModuleRoutes } from '../routes/heatmap.routes.js';
import { registerTravelModuleRoutes } from '../routes/travel.routes.js';
import { registerMarketModuleRoutes } from '../routes/market.routes.js';
import { registerModerationModuleRoutes } from '../routes/moderation.routes.js';
import { registerNotificationsModuleRoutes } from '../routes/notifications.routes.js';
import { registerPricingModuleRoutes } from '../routes/pricing.routes.js';
import { registerReputationModuleRoutes } from '../routes/reputation.routes.js';
import { registerTrustModuleRoutes } from '../routes/trust.routes.js';
import { registerReviewsModule } from '../modules/reviews/reviews.module.js';
import { registerListingMediaModuleRoutes } from '../routes/listing-media.routes.js';
import { registerListingsRoutes } from '../routes/listings.routes.js';
import { registerRecommendationsModuleRoutes } from '../routes/recommendations.routes.js';
import { registerSearchModuleRoutes } from '../routes/search.routes.js';

const CORS_ALLOWED_BASE = [
  'https://locus-web-seven.vercel.app',
  'https://locus.app',
  'http://localhost:3000',
] as const;

function getCorsAllowed(): string[] {
  const fromEnv = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  return [...new Set([...CORS_ALLOWED_BASE, ...fromEnv])];
}

function isOriginAllowed(origin: string, allowed: string[]): boolean {
  if (allowed.includes(origin)) return true;
  if (origin.endsWith('.vercel.app')) return true;
  return false;
}

export async function createServer(prisma: PrismaClient): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
  });

  const corsAllowed = getCorsAllowed();
  const defaultOrigin = corsAllowed[0] ?? 'https://locus-web-seven.vercel.app';
  app.addHook('onRequest', async (req, reply) => {
    if (req.method === 'OPTIONS') {
      const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
      const allowOrigin = origin && isOriginAllowed(origin, corsAllowed) ? origin : defaultOrigin;
      return reply
        .code(204)
        .header('Access-Control-Allow-Origin', allowOrigin)
        .header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
        .header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, Accept')
        .header('Access-Control-Allow-Credentials', 'true')
        .header('Access-Control-Max-Age', '86400')
        .send();
    }
  });

  await app.register(cors, {
    origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
      if (!origin) return cb(null, true);
      if (isOriginAllowed(origin, corsAllowed)) return cb(null, true);
      cb(new Error('Not allowed'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    optionsSuccessStatus: 204,
    preflight: true,
  });

  await app.register(multipart, {
    limits: {
      files: 20,
      fileSize: 20 * 1024 * 1024,
    },
  });
  await app.register(rawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
  });

  await registerInfrastructureModule(app, { prisma });
  const notificationsService = await registerNotificationsModuleRoutes(app, { prisma });
  const referralService = await registerReferralModuleRoutes(app, {
    prisma,
    notificationsService,
  });
  await registerAuthModule(app, { prisma, referralService });
  const recommendationsService = await registerRecommendationsModuleRoutes(app, { prisma });
  const moderationService = await registerModerationModuleRoutes(app, {
    prisma,
    notificationsService,
  });
  await registerListingsRoutes(app, { prisma, recommendationsService, moderationService });
  await registerListingMediaModuleRoutes(app, { prisma });
  await registerAiListingModuleRoutes(app);
  await registerSearchModuleRoutes(app, { prisma, recommendationsService });
  await registerAiSearchModuleRoutes(app, { prisma, recommendationsService });
  await registerAdminModule(app, { prisma });
  await registerAmenitiesModule(app, { prisma });
  await registerImportModuleRoutes(app, { prisma });
  await registerMatchModuleRoutes(app, { prisma });
  await registerMarketModuleRoutes(app, { prisma });
  await registerHeatmapModuleRoutes(app, { prisma });
  await registerTravelModuleRoutes(app, { prisma });
  await registerBookingsModule(app, { prisma, recommendationsService, notificationsService });
  await registerGrowthModule(app, { prisma });
  await registerHostAnalyticsModuleRoutes(app, { prisma });
  await registerMessagingModule(app, { prisma, notificationsService });
  await registerReviewsModule(app, { prisma });
  await registerAIModule(app, { prisma });
  await registerAIAdvancedModule(app, { prisma });
  await registerPaymentsModule(app, {
    prisma,
    notificationsService,
    referralService,
  });
  await registerPricingModuleRoutes(app, { prisma });
  await registerTrustModuleRoutes(app, { prisma });
  await registerReputationModuleRoutes(app, { prisma });

  return app;
}
