import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import * as api from '@/api/notifications';
import type { AppNotification } from '@/api/notifications';
import { useToast } from '@/context/ToastContext';
import { playNotificationSound } from '@/lib/notificationSound';

const SOCKET_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(
  /\/api\/v1\/?$/,
  ''
);

const MAX_RECENT = 30;

export interface UseNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  reload: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotifications(): UseNotificationsResult {
  const accessToken = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.user?.id);
  const { push: pushToast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const reload = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await api.listNotifications({ page: 1, limit: MAX_RECENT });
      const payload = res.data;
      setNotifications(payload?.data ?? []);
      setUnreadCount(payload?.unreadCount ?? 0);
    } catch {
      // Swallow — the bell stays at its last-known state.
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    reload();
  }, [accessToken, userId, reload]);

  useEffect(() => {
    if (!accessToken || !userId) return;

    const socket = io(`${SOCKET_URL}/notifications`, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // eslint-disable-next-line no-console
      console.log('[useNotifications] connected', socket.id);
    });
    socket.on('connect_error', (err) => {
      console.warn('[useNotifications] connect error:', err.message);
    });

    socket.on('notification:new', (n: AppNotification) => {
      setNotifications((prev) => {
        if (prev.some((p) => p._id === n._id)) return prev;
        return [n, ...prev].slice(0, MAX_RECENT);
      });
      setUnreadCount((c) => c + 1);
      pushToast(n.title, 'info');
      playNotificationSound();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, userId, pushToast]);

  const markRead = useCallback(async (id: string) => {
    try {
      await api.markNotificationRead(id);
    } catch {
      return;
    }
    setNotifications((prev) =>
      prev.map((n) => (n._id === id && !n.is_read ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => {
      const target = notifications.find((n) => n._id === id);
      if (!target || target.is_read) return c;
      return Math.max(0, c - 1);
    });
  }, [notifications]);

  const markAllRead = useCallback(async () => {
    try {
      await api.markAllNotificationsRead();
    } catch {
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, loading, reload, markRead, markAllRead };
}
