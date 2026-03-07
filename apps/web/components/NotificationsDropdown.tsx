'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Link } from '../i18n/navigation';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  type Notification,
} from '../services/notifications.service';

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [items, count] = await Promise.all([
        fetchNotifications(20),
        fetchUnreadCount(),
      ]);
      setNotifications(items);
      setUnreadCount(count);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUnreadCount().then(setUnreadCount).catch(() => setUnreadCount(0));
  }, []);

  useEffect(() => {
    if (open) {
      void loadNotifications();
    }
  }, [open, loadNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleMarkRead(notification: Notification) {
    if (notification.read) return;
    try {
      await markNotificationRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 active:bg-slate-200 md:min-h-0 md:min-w-0"
        aria-label="Уведомления"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-pink-600 px-1.5 text-xs font-medium text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-[400px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="font-semibold text-slate-900">Уведомления</h3>
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-slate-500">
                Загрузка...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                Нет уведомлений
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`px-4 py-3 transition hover:bg-slate-50 ${
                      !n.read ? 'bg-pink-50/50' : ''
                    }`}
                  >
                    <Link
                      href="/dashboard/notifications"
                      onClick={() => handleMarkRead(n)}
                      className="block"
                    >
                      <p className="font-medium text-slate-900">{n.title}</p>
                      <p className="mt-0.5 text-sm text-slate-600 line-clamp-2">{n.message}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(n.createdAt).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-slate-200 px-4 py-2">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-sm font-medium text-pink-600 hover:text-pink-700"
            >
              Все уведомления
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
