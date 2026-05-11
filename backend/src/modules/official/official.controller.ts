import { Response } from 'express';
import { officialService } from './official.service.js';
import type { AuthenticatedRequest } from '../../middleware/authenticate.js';

const NOT_FOUND = { status: 'error', code: 'NOT_FOUND', message: 'Official profile not found' };

function getUserId(req: AuthenticatedRequest, res: Response): string | null {
  const id = req.user?.sub;
  if (!id) {
    res.status(401).json({ status: 'error', code: 'UNAUTHORIZED', message: 'Missing user id' });
    return null;
  }
  return id;
}

function send500(res: Response, label: string, err: unknown) {
  console.error(`Error in official.${label}:`, err);
  res.status(500).json({ status: 'error', code: 'INTERNAL_ERROR', message: `Failed: ${label}` });
}

export const officialController = {
  async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
      const me = await officialService.getMe(userId);
      if (!me) {
        res.status(404).json(NOT_FOUND);
        return;
      }
      res.json({ status: 'success', data: me });
    } catch (err) { send500(res, 'getMe', err); }
  },

  async updateMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
      const updated = await officialService.updateMe(userId, req.body);
      if (!updated) {
        res.status(404).json(NOT_FOUND);
        return;
      }
      res.json({ status: 'success', data: updated });
    } catch (err) { send500(res, 'updateMe', err); }
  },

  async nearbyJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
      const result = await officialService.getNearbyJobs(userId, {
        page: Number(req.query.page) || undefined,
        limit: Number(req.query.limit) || undefined,
        search: (req.query.search as string) || undefined,
        category_id: (req.query.category_id as string) || undefined,
      });
      if (!result) {
        res.status(404).json(NOT_FOUND);
        return;
      }
      res.json({ status: 'success', data: result.jobs, pagination: result.pagination, location_missing: 'location_missing' in result ? (result as any).location_missing : false });
    } catch (err) { send500(res, 'nearbyJobs', err); }
  },

  async candidates(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
      const result = await officialService.getCandidates(userId, {
        page: Number(req.query.page) || undefined,
        limit: Number(req.query.limit) || undefined,
        search: (req.query.search as string) || undefined,
        kind: (req.query.kind as 'all' | 'registered' | 'walk_in') || undefined,
      });
      if (!result) {
        res.status(404).json(NOT_FOUND);
        return;
      }
      res.json({
        status: 'success',
        data: result.items,
        pagination: result.pagination,
        location_missing: 'location_missing' in result ? (result as any).location_missing : false,
      });
    } catch (err) { send500(res, 'candidates', err); }
  },

  async getCandidate(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
      const result = await officialService.getCandidate(userId, req.params.id);
      if (!result) {
        res.status(404).json({ status: 'error', code: 'NOT_FOUND', message: 'Candidate not found' });
        return;
      }
      res.json({ status: 'success', data: result });
    } catch (err) { send500(res, 'getCandidate', err); }
  },

  async createWalkIn(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      const result = await officialService.createWalkIn(userId, req.body, file, req.body.resume_url);
      res.status(201).json({ status: 'success', data: result });
    } catch (err: any) {
      if (err?.status) {
        res.status(err.status).json({ status: 'error', code: err.code ?? 'ERROR', message: err.message });
        return;
      }
      send500(res, 'createWalkIn', err);
    }
  },

  async push(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
      const result = await officialService.push(userId, req.body);
      res.status(201).json({ status: 'success', data: result });
    } catch (err: any) {
      if (err?.status) {
        res.status(err.status).json({ status: 'error', code: err.code ?? 'ERROR', message: err.message });
        return;
      }
      send500(res, 'push', err);
    }
  },

  async listPushes(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
      const result = await officialService.listPushes(userId, {
        page: Number(req.query.page) || undefined,
        limit: Number(req.query.limit) || undefined,
      });
      res.json({ status: 'success', data: result.items, pagination: result.pagination });
    } catch (err) { send500(res, 'listPushes', err); }
  },

  async nearbyHires(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
      const result = await officialService.getNearbyHires(userId, {
        page: Number(req.query.page) || undefined,
        limit: Number(req.query.limit) || undefined,
      });
      if (!result) {
        res.status(404).json(NOT_FOUND);
        return;
      }
      res.json({
        status: 'success',
        data: result.items,
        pagination: result.pagination,
        location_missing: 'location_missing' in result ? (result as any).location_missing : false,
      });
    } catch (err) { send500(res, 'nearbyHires', err); }
  },
};

export default officialController;
