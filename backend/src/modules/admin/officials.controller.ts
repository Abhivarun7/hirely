import { Response } from 'express';
import { officialsService } from './officials.service.js';
import type { AuthenticatedRequest } from '../../middleware/authenticate.js';

export const officialsController = {
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const adminId = req.user?.sub;
    if (!adminId) {
      res.status(401).json({ status: 'error', code: 'UNAUTHORIZED', message: 'Admin id missing' });
      return;
    }
    try {
      const result = await officialsService.create(req.body, adminId);
      res.status(201).json({
        status: 'success',
        data: {
          official_profile_id: result.profile._id,
          user_id: result.user._id,
          email: result.user.email,
        },
      });
    } catch (err: any) {
      if (err?.code === 'EMAIL_EXISTS') {
        res.status(409).json({ status: 'error', code: 'EMAIL_EXISTS', message: err.message });
        return;
      }
      console.error('Error creating official:', err);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to create official',
      });
    }
  },

  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await officialsService.list({
        page: Number(req.query.page) || undefined,
        limit: Number(req.query.limit) || undefined,
        search: (req.query.search as string) || undefined,
        is_active:
          req.query.is_active === 'true'
            ? true
            : req.query.is_active === 'false'
            ? false
            : undefined,
        city: (req.query.city as string) || undefined,
      });
      res.json({ status: 'success', data: result.items, pagination: result.pagination });
    } catch (err) {
      console.error('Error listing officials:', err);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to list officials',
      });
    }
  },

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const profile = await officialsService.getById(req.params.officialId);
      if (!profile) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Official not found',
        });
        return;
      }
      res.json({ status: 'success', data: profile });
    } catch (err) {
      console.error('Error getting official:', err);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get official',
      });
    }
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const profile = await officialsService.update(req.params.officialId, req.body);
      if (!profile) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Official not found',
        });
        return;
      }
      res.json({ status: 'success', data: profile });
    } catch (err) {
      console.error('Error updating official:', err);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to update official',
      });
    }
  },

  async deactivate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const profile = await officialsService.setActive(req.params.officialId, false);
      if (!profile) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Official not found',
        });
        return;
      }
      res.json({ status: 'success', data: profile });
    } catch (err) {
      console.error('Error deactivating official:', err);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to deactivate official',
      });
    }
  },

  async reactivate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const profile = await officialsService.setActive(req.params.officialId, true);
      if (!profile) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Official not found',
        });
        return;
      }
      res.json({ status: 'success', data: profile });
    } catch (err) {
      console.error('Error reactivating official:', err);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to reactivate official',
      });
    }
  },

  async resendWelcome(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const ok = await officialsService.resendWelcomeEmail(req.params.officialId);
      if (!ok) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Official not found',
        });
        return;
      }
      res.json({ status: 'success', message: 'Welcome email queued' });
    } catch (err) {
      console.error('Error resending welcome:', err);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to resend welcome email',
      });
    }
  },
};

export default officialsController;
