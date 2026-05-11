import mongoose from 'mongoose';
import { SupportTicket, TicketMessage, User } from '../../models/index.js';
import { emailService } from '../shared/email.service.js';
import { emitTicketMessage, emitTicketStatus } from '../../realtime/socket.js';
import { enrichMessageSender, enrichMessageSenders } from '../shared/senderName.js';
import { notificationService } from '../shared/notification.service.js';

export interface CreateTicketInput {
  subject: string;
  description: string;
}

export interface ListMyTicketsFilters {
  page?: number;
  limit?: number;
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
}

class SupportService {
  async createTicket(userId: string, input: CreateTicketInput): Promise<unknown> {
    const ticket = await SupportTicket.create({
      submitted_by: new mongoose.Types.ObjectId(userId),
      subject: input.subject.trim(),
      description: input.description.trim(),
      status: 'open',
    });

    // The submitter's first message is the description so the conversation
    // thread shows context for any admin who picks it up.
    await TicketMessage.create({
      ticket_id: ticket._id,
      sender_id: new mongoose.Types.ObjectId(userId),
      message: input.description.trim(),
    });

    // Fire-and-forget acknowledgement so the user knows we received it.
    void (async () => {
      try {
        const user = await User.findById(userId).select('email').lean();
        if (user?.email) {
          await emailService.sendTicketCreatedEmail({
            to: user.email,
            ticketId: ticket._id.toString(),
            subject: ticket.subject,
            description: ticket.description ?? input.description,
          });
        }
      } catch (err) {
        console.error('[support] failed to send ticket-created email:', err);
      }
    })();

    // Notify the support team in-app so the queue lights up immediately.
    void (async () => {
      try {
        await notificationService.notifyAdminsWithPermission('tickets:view', {
          type: 'ticket.created',
          title: `New support ticket: ${ticket.subject}`,
          body: ticket.description?.slice(0, 200),
          link: `/admin/tickets?id=${ticket._id.toString()}`,
        });
      } catch (err) {
        console.error('[support] failed to notify admins of new ticket:', err);
      }
    })();

    return ticket.toObject();
  }

  async listMyTickets(
    userId: string,
    filters: ListMyTicketsFilters
  ): Promise<{ tickets: unknown[]; pagination: unknown }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { submitted_by: userId };
    if (filters.status) query.status = filters.status;

    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .populate('assigned_to', 'email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SupportTicket.countDocuments(query),
    ]);

    return {
      tickets,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getMyTicket(userId: string, ticketId: string): Promise<unknown> {
    const ticket = await SupportTicket.findOne({ _id: ticketId, submitted_by: userId })
      .populate('assigned_to', 'email')
      .populate('submitted_by', 'email')
      .lean();
    if (!ticket) throw new Error('Ticket not found');

    const rawMessages = await TicketMessage.find({ ticket_id: ticketId })
      .populate('sender_id', 'email role')
      .sort({ sent_at: 1 })
      .lean();
    const messages = await enrichMessageSenders(rawMessages);

    return { ...ticket, messages };
  }

  async replyToMyTicket(
    userId: string,
    ticketId: string,
    payload: { message?: string; attachments?: Array<{ url: string; filename: string; mime: string; size: number }> }
  ): Promise<unknown> {
    const ticket = await SupportTicket.findOne({ _id: ticketId, submitted_by: userId }).select(
      '_id subject status assigned_to'
    );
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.status === 'closed') {
      throw new Error('This ticket is closed. Open a new one if you still need help.');
    }

    const reply = await TicketMessage.create({
      ticket_id: ticket._id,
      sender_id: new mongoose.Types.ObjectId(userId),
      message: payload.message?.trim(),
      attachments: payload.attachments?.length ? payload.attachments : undefined,
    });

    const populated = await reply.populate('sender_id', 'email role');
    const enriched = await enrichMessageSender(populated.toObject());

    // Re-open if the submitter replied after admin marked resolved.
    if (ticket.status === 'resolved') {
      await SupportTicket.updateOne({ _id: ticket._id }, { $set: { status: 'in_progress' } });
      emitTicketStatus(ticket._id.toString(), 'in_progress');
    }

    emitTicketMessage(ticket._id.toString(), enriched);

    // Notify the assigned admin (or the whole support team if unassigned).
    void (async () => {
      try {
        const submitter = await User.findById(userId).select('email').lean();
        const preview = payload.message?.trim().slice(0, 200);
        const title = `New reply on "${ticket.subject}"`;
        const body = `${submitter?.email ?? 'A user'} replied${preview ? `: ${preview}` : ''}`;
        const link = `/admin/tickets?id=${ticket._id.toString()}`;
        if (ticket.assigned_to) {
          await notificationService.notify(
            ticket.assigned_to.toString(),
            'ticket.reply',
            title,
            body,
            link
          );
        } else {
          await notificationService.notifyAdminsWithPermission('tickets:view', {
            type: 'ticket.reply',
            title,
            body,
            link,
          });
        }
      } catch (err) {
        console.error('[support] failed to notify admins of user reply:', err);
      }
    })();

    return enriched;
  }
}

export const supportService = new SupportService();
export default supportService;
