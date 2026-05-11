import type { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { SupportTicket, User } from '../models/index.js';
import { getEffectivePermissions } from '../middleware/requirePermission.js';
import { enrichMessageSender } from '../modules/shared/senderName.js';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

interface AuthedSocket extends Socket {
  data: {
    userId: string;
    email: string;
    role: string;
    displayName?: string;
  };
}

let io: IOServer | null = null;

export function initSocket(httpServer: HttpServer): IOServer {
  io = new IOServer(httpServer, {
    cors: {
      origin: config.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
      credentials: true,
    },
  });

  const supportNs = io.of('/support');
  const notificationsNs = io.of('/notifications');

  const jwtAuth = (socket: Socket, next: (err?: Error) => void): void => {
    try {
      const token =
        (socket.handshake.auth as { token?: string } | undefined)?.token ??
        (socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '');
      if (!token) return next(new Error('No token'));
      const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload;
      (socket as AuthedSocket).data = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  };

  supportNs.use(jwtAuth);
  notificationsNs.use(jwtAuth);

  // Per-user notifications: each authenticated socket auto-joins its own
  // user room. Server-side code emits to `user:<id>` to push notifications
  // to all sessions of that user.
  notificationsNs.on('connection', (socket) => {
    const s = socket as AuthedSocket;
    socket.join(userRoom(s.data.userId));
  });

  supportNs.on('connection', async (socket) => {
    const s = socket as AuthedSocket;
    console.log('[support socket] connected', socket.id, 'user=', s.data.userId, 'role=', s.data.role);

    // Resolve a friendly display name once per socket connection so typing
    // indicators read "Alex Mercer is typing" instead of an email address.
    try {
      const enriched = await enrichMessageSender({ sender_id: s.data.userId });
      s.data.displayName = enriched.sender_id.display_name;
    } catch {
      s.data.displayName = s.data.email;
    }

    socket.on('disconnect', (reason) => {
      console.log('[support socket] disconnected', socket.id, 'reason=', reason);
    });

    // Join a ticket room. Verify the user is allowed to view this ticket
    // (submitter, or admin with tickets:view).
    socket.on('ticket:join', async (ticketId: string, ack?: (ok: boolean) => void) => {
      try {
        const allowed = await canViewTicket(s.data.userId, ticketId);
        if (!allowed) {
          console.warn('[support socket] join DENIED', { user: s.data.userId, ticketId });
          ack?.(false);
          return;
        }
        socket.join(roomName(ticketId));
        const room = roomName(ticketId);
        const size = supportNs.adapter.rooms.get(room)?.size ?? 0;
        console.log('[support socket] join OK', { user: s.data.userId, ticketId, roomSize: size });
        ack?.(true);
      } catch (err) {
        console.error('[support socket] ticket:join error', err);
        ack?.(false);
      }
    });

    socket.on('ticket:leave', (ticketId: string) => {
      socket.leave(roomName(ticketId));
      console.log('[support socket] left', { user: s.data.userId, ticketId });
    });

    // Typing — broadcast to everyone else in the room.
    socket.on('ticket:typing', (ticketId: string) => {
      socket.to(roomName(ticketId)).emit('ticket:typing', {
        ticketId,
        userId: s.data.userId,
        email: s.data.email,
        displayName: s.data.displayName ?? s.data.email,
        role: s.data.role,
      });
    });

    socket.on('ticket:stopped-typing', (ticketId: string) => {
      socket.to(roomName(ticketId)).emit('ticket:stopped-typing', {
        ticketId,
        userId: s.data.userId,
      });
    });
  });

  return io;
}

export function getIo(): IOServer | null {
  return io;
}

export function emitTicketMessage(ticketId: string, payload: unknown): void {
  if (!io) {
    console.warn('[emitTicketMessage] io not initialized');
    return;
  }
  const ns = io.of('/support');
  const room = roomName(ticketId);
  const size = ns.adapter.rooms.get(room)?.size ?? 0;
  console.log('[emitTicketMessage]', { ticketId, room, recipients: size });
  ns.to(room).emit('ticket:message', { ticketId, message: payload });
}

export function emitTicketStatus(ticketId: string, status: string): void {
  if (!io) return;
  const ns = io.of('/support');
  const room = roomName(ticketId);
  const size = ns.adapter.rooms.get(room)?.size ?? 0;
  console.log('[emitTicketStatus]', { ticketId, status, recipients: size });
  ns.to(room).emit('ticket:status', { ticketId, status });
}

export function emitNotification(userId: string, payload: unknown): void {
  if (!io) return;
  io.of('/notifications').to(userRoom(userId)).emit('notification:new', payload);
}

function roomName(ticketId: string): string {
  return `ticket:${ticketId}`;
}

function userRoom(userId: string): string {
  return `user:${userId}`;
}

async function canViewTicket(userId: string, ticketId: string): Promise<boolean> {
  // Submitter is always allowed.
  const ticket = await SupportTicket.findById(ticketId).select('submitted_by').lean();
  if (!ticket) return false;
  if (ticket.submitted_by?.toString() === userId) return true;

  // Otherwise an admin with tickets:view (or assigned_to themselves).
  const user = await User.findById(userId).select('admin_role_id role').lean();
  if (!user) return false;
  const perms = await getEffectivePermissions(userId);
  return perms.has('tickets:view');
}
