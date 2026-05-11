import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { playNotificationSound } from '@/lib/notificationSound';

export interface TicketMessagePayload {
  _id: string;
  ticket_id: string;
  sender_id: string | { _id: string; email?: string; role?: string };
  message?: string;
  attachments?: Array<{ url: string; filename: string; mime: string; size: number }>;
  sent_at: string;
}

interface TypingPayload {
  ticketId: string;
  userId: string;
  email: string;
  displayName?: string;
  role: string;
}

interface UseTicketSocketOptions {
  ticketId: string | null;
  onMessage?: (msg: TicketMessagePayload) => void;
  onStatus?: (status: string) => void;
  onTyping?: (info: TypingPayload) => void;
  onStoppedTyping?: (info: { userId: string }) => void;
}

const SOCKET_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/api\/v1\/?$/, '');
const TYPING_THROTTLE_MS = 1500;
const STOPPED_TYPING_DELAY_MS = 2500;

export function useTicketSocket({
  ticketId,
  onMessage,
  onStatus,
  onTyping,
  onStoppedTyping,
}: UseTicketSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const lastTypingEmitRef = useRef<number>(0);
  const stoppedTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.user?.id);
  const [connected, setConnected] = useState(false);

  // Latest callback refs so we don't tear down the socket every render.
  const onMessageRef = useRef(onMessage);
  const onStatusRef = useRef(onStatus);
  const onTypingRef = useRef(onTyping);
  const onStoppedTypingRef = useRef(onStoppedTyping);
  onMessageRef.current = onMessage;
  onStatusRef.current = onStatus;
  onTypingRef.current = onTyping;
  onStoppedTypingRef.current = onStoppedTyping;

  useEffect(() => {
    if (!ticketId || !accessToken) return;

    // Allow polling fallback so corporate proxies / local browser quirks that
    // block raw websockets still get live updates.
    const socket = io(`${SOCKET_URL}/support`, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // eslint-disable-next-line no-console
      console.log('[useTicketSocket] connected', socket.id, '→ joining', ticketId);
      socket.emit('ticket:join', ticketId, (ok: boolean) => {
        if (!ok) {
          console.warn('[useTicketSocket] join refused for', ticketId);
        } else {
          // eslint-disable-next-line no-console
          console.log('[useTicketSocket] joined room ticket:', ticketId);
        }
      });
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      // eslint-disable-next-line no-console
      console.log('[useTicketSocket] disconnected:', reason);
    });

    socket.on('ticket:message', (data: { ticketId: string; message: TicketMessagePayload }) => {
      if (data.ticketId !== ticketId) return;
      onMessageRef.current?.(data.message);
      // Chime when someone else replies; staying silent on our own echo.
      const senderId =
        typeof data.message.sender_id === 'string'
          ? data.message.sender_id
          : data.message.sender_id?._id;
      if (senderId && senderId !== userId) {
        playNotificationSound();
      }
    });

    socket.on('ticket:status', (data: { ticketId: string; status: string }) => {
      if (data.ticketId !== ticketId) return;
      onStatusRef.current?.(data.status);
    });

    socket.on('ticket:typing', (data: TypingPayload) => {
      if (data.ticketId !== ticketId) return;
      onTypingRef.current?.(data);
    });

    socket.on('ticket:stopped-typing', (data: { ticketId: string; userId: string }) => {
      if (data.ticketId !== ticketId) return;
      onStoppedTypingRef.current?.(data);
    });

    socket.on('connect_error', (err) => {
      console.warn('[useTicketSocket] connect error:', err.message);
    });

    return () => {
      socket.emit('ticket:leave', ticketId);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      if (stoppedTypingTimerRef.current) {
        clearTimeout(stoppedTypingTimerRef.current);
        stoppedTypingTimerRef.current = null;
      }
    };
  }, [ticketId, accessToken, userId]);

  /** Call this on every keystroke. Emits a typing event at most once per
   * TYPING_THROTTLE_MS, and schedules a stopped-typing emit after the user
   * stops typing for STOPPED_TYPING_DELAY_MS. */
  const notifyTyping = () => {
    const socket = socketRef.current;
    if (!socket || !ticketId) return;
    const now = Date.now();
    if (now - lastTypingEmitRef.current > TYPING_THROTTLE_MS) {
      lastTypingEmitRef.current = now;
      socket.emit('ticket:typing', ticketId);
    }
    if (stoppedTypingTimerRef.current) clearTimeout(stoppedTypingTimerRef.current);
    stoppedTypingTimerRef.current = setTimeout(() => {
      socket.emit('ticket:stopped-typing', ticketId);
      stoppedTypingTimerRef.current = null;
    }, STOPPED_TYPING_DELAY_MS);
  };

  return { notifyTyping, connected };
}
