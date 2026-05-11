import { z } from 'zod';

const createTicketBody = z.object({
  subject: z.string().min(1).max(255),
  description: z.string().min(1).max(5000),
});

const listMyTicketsQuery = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
});

const ticketIdParams = z.object({ ticketId: z.string().min(1) });

const attachmentSchema = z.object({
  url: z.string().min(1),
  filename: z.string().min(1).max(255),
  mime: z.string().min(1).max(100),
  size: z.number().int().min(0),
});

const replyBody = z
  .object({
    message: z.string().max(5000).optional(),
    attachments: z.array(attachmentSchema).max(5).optional(),
  })
  .refine(
    (val) => (val.message?.trim().length ?? 0) > 0 || (val.attachments?.length ?? 0) > 0,
    { message: 'Provide a message or at least one attachment' }
  );

export const createTicketSchema = { body: createTicketBody };
export const listMyTicketsSchema = { query: listMyTicketsQuery };
export const ticketIdParamSchema = { params: ticketIdParams };
export const replyToMyTicketSchema = { params: ticketIdParams, body: replyBody };
