import type { ListingStatus, UserRole } from '@prisma/client';

export type AdminUserView = {
  id: string;
  email: string;
  role: UserRole;
  rating: number;
  createdAt: Date;
  isBlocked: boolean;
};

export type CreateReportPayload = {
  targetType: 'listing' | 'user' | 'message';
  targetId: string;
  reason: string;
};

export type AdminReport = {
  id: string;
  reporterId: string;
  targetType: 'listing' | 'user' | 'message';
  targetId: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED';
  actionTaken: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type AdminListingAction = 'approve' | 'reject' | 'block';

export const LISTING_STATUS_BY_ACTION: Record<AdminListingAction, ListingStatus> = {
  approve: 'PUBLISHED',
  reject: 'ARCHIVED',
  block: 'BLOCKED',
};

export class AdminError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AdminError';
    this.statusCode = statusCode;
  }
}
