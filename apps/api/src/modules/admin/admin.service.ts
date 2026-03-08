import { randomUUID } from 'node:crypto';

import type Redis from 'ioredis';

import { getSharedRedis } from '../../lib/redis.client.js';
import type { AuthenticatedUser } from '../../utils/auth.js';
import { AdminAnalyticsService } from './admin.analytics.service.js';
import { AdminAuditService } from './admin.audit.service.js';
import { AdminRepository } from './admin.repository.js';
import { AdminError, LISTING_STATUS_BY_ACTION, type AdminListingAction, type AdminReport, type CreateReportPayload } from './admin.types.js';

export class AdminService {
  private readonly redis: Redis | null;
  private readonly reportsFallback: AdminReport[] = [];
  private readonly reportsKey = 'admin:reports';

  public constructor(
    private readonly repository: AdminRepository,
    private readonly analytics: AdminAnalyticsService,
    private readonly audit: AdminAuditService,
  ) {
    this.redis = getSharedRedis();
  }

  public async getUsers() {
    return this.repository.getUsers();
  }

  public async getUserById(id: string) {
    assertId(id, 'User id is required');
    const user = await this.repository.getUserById(id);
    if (!user) {
      throw new AdminError('User not found', 404);
    }
    return user;
  }

  public async blockUser(actor: AuthenticatedUser, id: string) {
    assertId(id, 'User id is required');
    const user = await this.repository.setUserBlockedState(id, true);
    await this.audit.log({
      action: 'user_blocked',
      actorId: actor.id,
      targetId: id,
      metadata: { role: user.role },
    });
    return user;
  }

  public async unblockUser(actor: AuthenticatedUser, id: string) {
    assertId(id, 'User id is required');
    const user = await this.repository.setUserBlockedState(id, false);
    await this.audit.log({
      action: 'user_unblocked',
      actorId: actor.id,
      targetId: id,
      metadata: { role: user.role },
    });
    return user;
  }

  public async getListings() {
    return this.repository.getListings();
  }

  public async getListingById(id: string) {
    assertId(id, 'Listing id is required');
    const listing = await this.repository.getListingById(id);
    if (!listing) {
      throw new AdminError('Listing not found', 404);
    }
    return listing;
  }

  public async moderateListing(actor: AuthenticatedUser, listingId: string, action: AdminListingAction) {
    assertId(listingId, 'Listing id is required');
    const status = LISTING_STATUS_BY_ACTION[action];
    const listing = await this.repository.setListingStatus(listingId, status);

    await this.audit.log({
      action:
        action === 'approve'
          ? 'listing_approved'
          : action === 'block'
            ? 'listing_blocked'
            : 'listing_removed',
      actorId: actor.id,
      targetId: listingId,
      metadata: { status },
    });

    return listing;
  }

  public async getBookings() {
    return this.repository.getBookings();
  }

  public async getBookingById(id: string) {
    assertId(id, 'Booking id is required');
    const booking = await this.repository.getBookingById(id);
    if (!booking) {
      throw new AdminError('Booking not found', 404);
    }
    return booking;
  }

  public async getStats() {
    return this.repository.getStats();
  }

  public async getAnalytics() {
    return this.analytics.getAnalytics();
  }

  public async getAuditLog() {
    return this.audit.getRecent(100);
  }

  public async createReport(actor: AuthenticatedUser, payload: unknown) {
    const reportPayload = parseCreateReport(payload);
    const report: AdminReport = {
      id: randomUUID(),
      reporterId: actor.id,
      targetType: reportPayload.targetType,
      targetId: reportPayload.targetId,
      reason: reportPayload.reason,
      status: 'OPEN',
      actionTaken: null,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };

    await this.saveReport(report);
    return report;
  }

  public async getReports() {
    return this.readReports();
  }

  public async resolveReport(actor: AuthenticatedUser, reportId: string, actionTaken: string | null) {
    assertId(reportId, 'Report id is required');
    const reports = await this.readReports();
    const idx = reports.findIndex((report) => report.id === reportId);
    if (idx === -1) {
      throw new AdminError('Report not found', 404);
    }
    reports[idx] = {
      ...reports[idx],
      status: 'RESOLVED',
      actionTaken: actionTaken ?? reports[idx].actionTaken,
      resolvedAt: new Date().toISOString(),
    };
    await this.overwriteReports(reports);

    await this.audit.log({
      action: 'report_resolved',
      actorId: actor.id,
      targetId: reportId,
      metadata: { actionTaken: actionTaken ?? null },
    });

    return reports[idx];
  }

  private async saveReport(report: AdminReport): Promise<void> {
    if (this.redis) {
      await this.redis.lpush(this.reportsKey, JSON.stringify(report));
      await this.redis.ltrim(this.reportsKey, 0, 999);
      await this.redis.expire(this.reportsKey, 60 * 60 * 24 * 90);
      return;
    }
    this.reportsFallback.unshift(report);
    this.reportsFallback.splice(1000);
  }

  private async readReports(): Promise<AdminReport[]> {
    if (this.redis) {
      const rows = await this.redis.lrange(this.reportsKey, 0, 999);
      return rows
        .map((row) => this.safeParse(row))
        .filter((row): row is AdminReport => row !== null);
    }
    return [...this.reportsFallback];
  }

  private async overwriteReports(reports: AdminReport[]): Promise<void> {
    if (this.redis) {
      const multi = this.redis.multi();
      multi.del(this.reportsKey);
      reports.forEach((report) => multi.rpush(this.reportsKey, JSON.stringify(report)));
      multi.expire(this.reportsKey, 60 * 60 * 24 * 90);
      await multi.exec();
      return;
    }
    this.reportsFallback.splice(0, this.reportsFallback.length, ...reports);
  }

  private safeParse(value: string): AdminReport | null {
    try {
      return JSON.parse(value) as AdminReport;
    } catch {
      return null;
    }
  }
}

function assertId(value: string, message: string): void {
  if (!value || !value.trim()) {
    throw new AdminError(message, 400);
  }
}

function parseCreateReport(payload: unknown): CreateReportPayload {
  if (!isObject(payload)) {
    throw new AdminError('Invalid report payload', 400);
  }

  const targetType = payload.targetType;
  if (targetType !== 'listing' && targetType !== 'user' && targetType !== 'message') {
    throw new AdminError('Invalid report targetType', 400);
  }

  const targetId = payload.targetId;
  if (typeof targetId !== 'string' || !targetId.trim()) {
    throw new AdminError('targetId is required', 400);
  }

  const reason = payload.reason;
  if (typeof reason !== 'string' || !reason.trim()) {
    throw new AdminError('reason is required', 400);
  }

  return {
    targetType,
    targetId: targetId.trim(),
    reason: reason.trim(),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
