import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import type { NotificationsService } from '../notifications/notifications.service.js';
import type { RecommendationsService } from '../recommendations/recommendations.service.js';
import { BookingsCalendar } from './bookings.calendar.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsPricing } from './bookings.pricing.js';
import { BookingsRepository } from './bookings.repository.js';
import { registerBookingsRoutes } from './bookings.routes.js';
import { BookingsService } from './bookings.service.js';

type BookingsModuleOptions = {
  prisma: PrismaClient;
  recommendationsService?: RecommendationsService;
  notificationsService?: NotificationsService;
};

export async function registerBookingsModule(
  fastify: FastifyInstance,
  options: BookingsModuleOptions,
): Promise<void> {
  const repository = new BookingsRepository(options.prisma);
  const calendar = new BookingsCalendar(repository);
  const pricing = new BookingsPricing();
  const service = new BookingsService(
    repository,
    calendar,
    pricing,
    options.recommendationsService,
    options.notificationsService,
    options.prisma,
  );
  const controller = new BookingsController(service);

  await registerBookingsRoutes(fastify, controller);
}
