'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  fetchNotifications,
  markNotificationRead,
  type Notification,
} from '../../../../services/notifications.service';

export default function DashboardNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchNotifications(100);
      setNotifications(items);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleMarkRead(notification: Notification) {
    if (notification.read) return;
    try {
      await markNotificationRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-slate-200" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Уведомления</h2>

      {notifications.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
          Нет уведомлений
        </p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border px-4 py-3 transition ${
                !n.read
                  ? 'border-pink-200 bg-pink-50/50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <button
                type="button"
                onClick={() => handleMarkRead(n)}
                className="w-full text-left"
              >
                <p className="font-medium text-slate-900">{n.title}</p>
                <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {new Date(n.createdAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
