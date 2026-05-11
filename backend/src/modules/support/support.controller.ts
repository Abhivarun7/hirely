import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate.js';
import { supportService } from './support.service.js';

export class SupportController {
  async createTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(401).json({ status: 'error', code: 'UNAUTHORIZED', message: 'Authentication required' });
        return;
      }
      const ticket = await supportService.createTicket(userId, req.body);
      res.status(201).json({ status: 'success', data: ticket });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to raise ticket';
      console.error('[support.createTicket]', err);
      res.status(400).json({ status: 'error', code: 'ERROR', message });
    }
  }

  async listMyTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(401).json({ status: 'error', code: 'UNAUTHORIZED', message: 'Authentication required' });
        return;
      }
      const result = await supportService.listMyTickets(userId, {
        page: parseInt(req.query.page as string) || undefined,
        limit: parseInt(req.query.limit as string) || undefined,
        status: req.query.status as
          | 'open'
          | 'in_progress'
          | 'resolved'
          | 'closed'
          | undefined,
      });
      res.json({ status: 'success', data: result.tickets, pagination: result.pagination });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list tickets';
      console.error('[support.listMyTickets]', err);
      res.status(500).json({ status: 'error', code: 'INTERNAL_ERROR', message });
    }
  }

  async getMyTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(401).json({ status: 'error', code: 'UNAUTHORIZED', message: 'Authentication required' });
        return;
      }
      const ticket = await supportService.getMyTicket(userId, req.params.ticketId);
      res.json({ status: 'success', data: ticket });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ticket not found';
      res.status(404).json({ status: 'error', code: 'NOT_FOUND', message });
    }
  }

  async replyToMyTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(401).json({ status: 'error', code: 'UNAUTHORIZED', message: 'Authentication required' });
        return;
      }
      const reply = await supportService.replyToMyTicket(userId, req.params.ticketId, {
        message: req.body.message,
        attachments: req.body.attachments,
      });
      res.status(201).json({ status: 'success', data: reply });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reply';
      res.status(400).json({ status: 'error', code: 'ERROR', message });
    }
  }

  async uploadAttachments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(401).json({ status: 'error', code: 'UNAUTHORIZED', message: 'Authentication required' });
        return;
      }
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      if (files.length === 0) {
        res.status(400).json({ status: 'error', code: 'NO_FILE', message: 'No files uploaded' });
        return;
      }
      // /uploads is statically served by the express app — return relative URLs
      // the frontend can render directly.
      const data = files.map((f) => ({
        url: `/uploads/tickets/${f.filename}`,
        filename: f.originalname,
        mime: f.mimetype,
        size: f.size,
      }));
      res.status(201).json({ status: 'success', data });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      console.error('[support.uploadAttachments]', err);
      res.status(400).json({ status: 'error', code: 'ERROR', message });
    }
  }
}

export const supportController = new SupportController();
export default supportController;
