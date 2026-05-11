import api from './client';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface TicketSummary {
  _id: string;
  subject: string;
  description?: string;
  status: TicketStatus;
  assigned_to?: { _id: string; email?: string } | null;
  submitted_by?: { _id: string; email?: string };
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessage {
  _id: string;
  ticket_id: string;
  sender_id:
    | { _id: string; email?: string; role?: string; display_name?: string }
    | string;
  message?: string;
  attachments?: Array<{ url: string; filename: string; mime: string; size: number }>;
  sent_at: string;
}

export interface TicketDetail extends TicketSummary {
  messages: TicketMessage[];
}

export interface TicketAttachment {
  url: string;
  filename: string;
  mime: string;
  size: number;
}

export const supportEndpoints = {
  createTicket: (data: { subject: string; description: string }) =>
    api.post<{ data: TicketSummary }>('/support/tickets', data),

  listMyTickets: (params?: {
    status?: TicketStatus;
    page?: number;
    limit?: number;
  }) =>
    api.get<{ data: TicketSummary[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(
      '/support/tickets',
      { params }
    ),

  getMyTicket: (ticketId: string) =>
    api.get<{ data: TicketDetail }>(`/support/tickets/${ticketId}`),

  replyToTicket: (
    ticketId: string,
    payload: { message?: string; attachments?: TicketAttachment[] }
  ) => api.post<{ data: TicketMessage }>(`/support/tickets/${ticketId}/messages`, payload),

  uploadAttachments: (ticketId: string, files: File[]) => {
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    return api.post<{ data: TicketAttachment[] }>(
      `/support/tickets/${ticketId}/attachments`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },
};
