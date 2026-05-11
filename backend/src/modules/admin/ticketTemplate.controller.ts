import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate.js';
import { ticketTemplateService } from './ticketTemplate.service.js';

export class TicketTemplateController {
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const activeOnly = req.query.active === 'true';
    const templates = await ticketTemplateService.list(activeOnly);
    res.json({ status: 'success', data: templates });
  }

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tpl = await ticketTemplateService.create({
        name: req.body.name,
        content: req.body.content,
        createdBy: req.user?.sub ?? '',
      });
      res.status(201).json({ status: 'success', data: tpl });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create template';
      res.status(400).json({ status: 'error', code: 'ERROR', message });
    }
  }

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tpl = await ticketTemplateService.update(req.params.id, req.body);
      res.json({ status: 'success', data: tpl });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update template';
      res.status(400).json({ status: 'error', code: 'ERROR', message });
    }
  }

  async remove(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await ticketTemplateService.remove(req.params.id);
      res.json({ status: 'success', message: 'Template deleted' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete template';
      res.status(400).json({ status: 'error', code: 'ERROR', message });
    }
  }
}

export const ticketTemplateController = new TicketTemplateController();
export default ticketTemplateController;
