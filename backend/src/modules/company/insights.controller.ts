import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate.js';
import { insightsService } from './insights.service.js';
import type { JobInviteStatus } from '../../models/JobInvite.js';

const VALID_INVITE_STATUSES: JobInviteStatus[] = ['sent', 'opened', 'clicked', 'applied'];

function requireCompanyId(req: AuthenticatedRequest, res: Response): string | null {
  const companyId = req.user?.company_id;
  if (!companyId) {
    res.status(403).json({
      status: 'error',
      code: 'FORBIDDEN',
      message: 'No company associated with this user',
    });
    return null;
  }
  return companyId.toString();
}

export class InsightsController {
  /**
   * GET /api/v1/company/insights/summary
   */
  async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    try {
      const data = await insightsService.getInsightsSummary({ companyId });
      res.json({ status: 'success', data });
    } catch (err) {
      console.error('Error getting insights summary:', err);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to load insights summary',
      });
    }
  }

  /**
   * GET /api/v1/company/insights/suggested-seekers
   */
  async getSuggestedSeekers(req: AuthenticatedRequest, res: Response): Promise<void> {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const jobId = typeof req.query.jobId === 'string' ? req.query.jobId : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    try {
      const data = await insightsService.getSuggestedSeekers({ companyId, jobId, limit });
      res.json({ status: 'success', data });
    } catch (err) {
      console.error('Error getting suggested seekers:', err);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to load suggested seekers',
      });
    }
  }

  /**
   * GET /api/v1/company/insights/nearby-seekers
   */
  async getNearbySeekers(req: AuthenticatedRequest, res: Response): Promise<void> {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const radiusKm = req.query.radiusKm ? Number(req.query.radiusKm) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const recencyDays = req.query.recencyDays ? Number(req.query.recencyDays) : undefined;
    try {
      const data = await insightsService.getNearbySeekers({
        companyId,
        radiusKm,
        limit,
        recencyDays,
      });
      res.json({ status: 'success', data });
    } catch (err) {
      console.error('Error getting nearby seekers:', err);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to load nearby seekers',
      });
    }
  }

  /**
   * POST /api/v1/company/insights/invite
   * body: { seekerId, jobId, message? }
   * Sends a "you'd be a great fit" email to the seeker with a deep link to
   * the public job page so they can apply.
   */
  async invite(req: AuthenticatedRequest, res: Response): Promise<void> {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const inviterUserId = req.user?.sub;
    if (!inviterUserId) {
      res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }
    const { seekerId, jobId, message } = req.body ?? {};
    if (typeof seekerId !== 'string' || typeof jobId !== 'string') {
      res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'seekerId and jobId are required',
      });
      return;
    }
    const trimmedMessage =
      typeof message === 'string' ? message.trim().slice(0, 1000) : undefined;
    try {
      const data = await insightsService.inviteSeekerToApply({
        companyId,
        inviterUserId,
        seekerId,
        jobId,
        message: trimmedMessage || undefined,
      });
      res.json({ status: 'success', data });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send invite';
      console.error('Error inviting seeker:', err);
      res.status(400).json({ status: 'error', code: 'ERROR', message: msg });
    }
  }

  /**
   * GET /api/v1/company/insights/invites
   * Optional query: status, jobId, page, limit
   */
  async listInvites(req: AuthenticatedRequest, res: Response): Promise<void> {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const jobId = typeof req.query.jobId === 'string' ? req.query.jobId : undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    if (status && !VALID_INVITE_STATUSES.includes(status as JobInviteStatus)) {
      res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: `status must be one of ${VALID_INVITE_STATUSES.join(', ')}`,
      });
      return;
    }
    try {
      const data = await insightsService.listInvites({
        companyId,
        status: status as JobInviteStatus | undefined,
        jobId,
        page,
        limit,
      });
      res.json({ status: 'success', data });
    } catch (err) {
      console.error('Error listing invites:', err);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to load invites',
      });
    }
  }

  /**
   * POST /api/v1/company/insights/invites/lookup
   * body: { pairs: [{ seekerId, jobId }, ...] }
   *
   * Bulk "do I have a recent invite for this seeker/job pair?" used by the
   * Insights UI to overlay status badges on the Suggested Seekers list.
   */
  async lookupInvites(req: AuthenticatedRequest, res: Response): Promise<void> {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const pairs = req.body?.pairs;
    if (!Array.isArray(pairs)) {
      res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'pairs must be an array',
      });
      return;
    }
    const cleaned = pairs
      .filter(
        (p): p is { seekerId: string; jobId: string } =>
          p && typeof p.seekerId === 'string' && typeof p.jobId === 'string'
      )
      .slice(0, 200);
    try {
      const data = await insightsService.getLatestInvitesFor({ companyId, pairs: cleaned });
      res.json({ status: 'success', data });
    } catch (err) {
      console.error('Error looking up invites:', err);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to look up invites',
      });
    }
  }

  /**
   * POST /api/v1/company/insights/explain-match
   * body: { seekerId, jobId }
   */
  async explainMatch(req: AuthenticatedRequest, res: Response): Promise<void> {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const { seekerId, jobId } = req.body ?? {};
    if (typeof seekerId !== 'string' || typeof jobId !== 'string') {
      res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'seekerId and jobId are required',
      });
      return;
    }
    try {
      const data = await insightsService.explainSeekerMatch({ companyId, seekerId, jobId });
      res.json({ status: 'success', data });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to explain match';
      console.error('Error explaining match:', err);
      res.status(400).json({ status: 'error', code: 'ERROR', message });
    }
  }
}

export const insightsController = new InsightsController();
export default insightsController;
