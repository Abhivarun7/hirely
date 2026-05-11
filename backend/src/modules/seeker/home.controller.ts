import { Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/authenticate.js';
import { User } from '../../models/User.js';
import { SeekerProfile } from '../../models/SeekerProfile.js';
import { homeService } from './home.service.js';

/**
 * Mirror of the helper in seeker.controller — duplicated to avoid coupling
 * the new home module to the older one. If the JWT was issued before we
 * embedded seeker_profile_id, fall back to a User lookup and lazily create.
 */
async function resolveSeekerProfileId(req: AuthenticatedRequest): Promise<string | null> {
  const fromToken = req.user?.seeker_profile_id;
  if (fromToken) return fromToken.toString();

  const userId = req.user?.sub;
  if (!userId) return null;

  const user = await User.findById(userId);
  if (!user || user.role !== 'job_seeker') return null;

  if (user.seeker_profile_id) {
    if (req.user) req.user.seeker_profile_id = user.seeker_profile_id.toString();
    return user.seeker_profile_id.toString();
  }

  const profile = await SeekerProfile.create({ user_id: user._id });
  user.seeker_profile_id = profile._id as mongoose.Types.ObjectId;
  await user.save();
  if (req.user) req.user.seeker_profile_id = profile._id.toString();
  return profile._id.toString();
}

const feedQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  reco_limit: z.coerce.number().min(1).max(50).optional(),
  nearby_limit: z.coerce.number().min(1).max(20).optional(),
});

const dismissBodySchema = z.object({
  job_id: z.string().min(1),
});

const trackBodySchema = z.object({
  type: z.enum(['view', 'click', 'apply', 'dismiss', 'save']),
  source: z.enum(['reco', 'nearby']),
  job_id: z.string().optional(),
  company_id: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
  position: z.number().min(0).optional(),
});

export class HomeController {
  /**
   * GET /api/v1/seeker/home/feed
   * Returns recommended jobs + nearby companies in a single round trip.
   */
  async getFeed(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({ status: 'error', code: 'FORBIDDEN', message: 'No seeker profile associated with this user' });
        return;
      }

      const validation = feedQuerySchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          errors: validation.error.flatten().fieldErrors,
        });
        return;
      }

      const { lat, lng, reco_limit, nearby_limit } = validation.data;
      const coords = lat != null && lng != null ? { latitude: lat, longitude: lng } : null;

      const feed = await homeService.getFeed(seekerProfileId, {
        coords,
        recoLimit: reco_limit,
        nearbyLimit: nearby_limit,
      });

      res.json({ status: 'success', data: feed });
    } catch (error) {
      console.error('Error getting home feed:', error);
      res.status(500).json({ status: 'error', code: 'INTERNAL_ERROR', message: 'Failed to get home feed' });
    }
  }

  /**
   * POST /api/v1/seeker/home/dismiss
   * Hide a recommended job from this seeker's feed for 30 days.
   */
  async dismiss(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({ status: 'error', code: 'FORBIDDEN', message: 'No seeker profile associated with this user' });
        return;
      }

      const validation = dismissBodySchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ status: 'error', code: 'VALIDATION_ERROR', message: 'job_id is required' });
        return;
      }
      if (!mongoose.isValidObjectId(validation.data.job_id)) {
        res.status(400).json({ status: 'error', code: 'VALIDATION_ERROR', message: 'Invalid job_id' });
        return;
      }

      await homeService.dismissJob(seekerProfileId, validation.data.job_id);
      // fire-and-forget telemetry
      homeService.track(seekerProfileId, {
        type: 'dismiss',
        source: 'reco',
        job_id: validation.data.job_id,
      }).catch(() => {});

      res.json({ status: 'success', message: 'Job dismissed' });
    } catch (error) {
      console.error('Error dismissing job:', error);
      res.status(500).json({ status: 'error', code: 'INTERNAL_ERROR', message: 'Failed to dismiss job' });
    }
  }

  /**
   * POST /api/v1/seeker/home/track
   * Best-effort telemetry write. Always 200s, even on validation errors,
   * so the client never has to retry.
   */
  async track(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(200).json({ status: 'success' });
        return;
      }
      const validation = trackBodySchema.safeParse(req.body);
      if (validation.success) {
        await homeService.track(seekerProfileId, validation.data);
      }
      res.json({ status: 'success' });
    } catch {
      res.json({ status: 'success' });
    }
  }
}

export const homeController = new HomeController();
export default homeController;
