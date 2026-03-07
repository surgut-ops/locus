import { apiRequest } from '../lib/api';

export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export async function fetchNotifications(limit?: number): Promise<Notification[]> {
  const query = limit ? `?limit=${limit}` : '';
  const response = await apiRequest<{ notifications: Notification[] }>(
    `/notifications${query}`,
    { cacheTtlMs: 0 },
  );
  return response.notifications;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
}

export async function fetchUnreadCount(): Promise<number> {
  const response = await apiRequest<{ count: number }>('/notifications/unread-count', {
    cacheTtlMs: 0,
  });
  return response.count;
}
