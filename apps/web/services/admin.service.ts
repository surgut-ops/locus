import { apiRequest } from '../lib/api';

export type AdminStats = {
  totalUsers: number;
  totalListings: number;
  totalBookings: number;
  totalRevenue: string;
};

export async function getAdminStats() {
  return apiRequest<AdminStats>('/admin/stats', { cacheTtlMs: 30_000 });
}

export async function getAdminAnalytics() {
  return apiRequest<{
    usersCount: number;
    listingsCount: number;
    bookingsCount: number;
    activeListings: number;
    estimatedRevenue: string;
  }>('/admin/analytics', { cacheTtlMs: 30_000 });
}

export async function getAdminUsers() {
  return apiRequest<
    Array<{
      id: string;
      email: string;
      role: string;
      rating: number;
      createdAt: string;
      isBlocked: boolean;
    }>
  >('/admin/users');
}

export async function blockUser(userId: string) {
  return apiRequest(`/admin/users/${userId}/block`, { method: 'PUT' });
}

export async function unblockUser(userId: string) {
  return apiRequest(`/admin/users/${userId}/unblock`, { method: 'PUT' });
}

export async function getAdminListings() {
  return apiRequest<Array<{ id: string; title: string; status: string; owner: { email: string } }>>(
    '/admin/listings',
  );
}

export async function moderateListing(listingId: string, action: 'approve' | 'reject' | 'block') {
  return apiRequest(`/admin/listings/${listingId}/${action}`, { method: 'PUT' });
}

export async function getAdminBookings() {
  return apiRequest<
    Array<{
      id: string;
      listing: { id: string; title: string; city: string; country: string; ownerId: string };
      guest: { id: string; email: string; firstName: string; lastName: string };
      startDate: string;
      endDate: string;
      totalPrice: string;
      status: string;
      currency: string;
    }>
  >('/admin/bookings');
}

export async function getAdminReports() {
  return apiRequest<
    Array<{
      id: string;
      reporterId: string;
      targetType: string;
      targetId: string;
      reason: string;
      status: string;
      actionTaken: string | null;
      createdAt: string;
      resolvedAt: string | null;
    }>
  >('/admin/reports');
}

export async function resolveReport(reportId: string, actionTaken: string) {
  return apiRequest(`/admin/reports/${reportId}/resolve`, {
    method: 'PUT',
    body: { actionTaken },
  });
}

export async function getAdminAudit() {
  return apiRequest<Array<{ id: string; action: string; actorId: string; targetId: string; createdAt: string }>>(
    '/admin/audit',
  );
}
