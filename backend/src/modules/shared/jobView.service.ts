import crypto from 'crypto';
import mongoose from 'mongoose';
import { Job, JobView } from '../../models/index.js';
import type { JobViewerType, JobViewSource } from '../../models/JobView.js';

const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface RecordViewInput {
  jobId: string | mongoose.Types.ObjectId;
  viewerKey: string;
  viewerType: JobViewerType;
  source: JobViewSource;
}

/**
 * Record a job-detail view. Dedupes the same viewer within 24h and only
 * increments Job.views_count on a fresh view. Never throws — view tracking
 * must not break a detail-page response.
 */
export async function recordJobView({
  jobId,
  viewerKey,
  viewerType,
  source,
}: RecordViewInput): Promise<void> {
  try {
    const jobObjectId =
      typeof jobId === 'string' ? new mongoose.Types.ObjectId(jobId) : jobId;

    const cutoff = new Date(Date.now() - DEDUPE_WINDOW_MS);
    const recent = await JobView.findOne({
      job_id: jobObjectId,
      viewer_key: viewerKey,
      ts: { $gte: cutoff },
    })
      .select('_id')
      .lean();

    if (recent) return;

    const job = await Job.findById(jobObjectId).select('company_id').lean();
    if (!job) return;

    await Promise.all([
      JobView.create({
        job_id: jobObjectId,
        company_id: job.company_id,
        viewer_key: viewerKey,
        viewer_type: viewerType,
        source,
        ts: new Date(),
      }),
      Job.updateOne({ _id: jobObjectId }, { $inc: { views_count: 1 } }),
    ]);
  } catch (err) {
    console.error('[recordJobView] failed silently:', err);
  }
}

/**
 * Build a stable viewer key from request signal. Caller decides which one to
 * use based on auth state — this is just a helper to centralize the rules.
 */
export function buildViewerKey(input: {
  seekerId?: string | mongoose.Types.ObjectId | null;
  userId?: string | mongoose.Types.ObjectId | null;
  ip?: string | null;
  userAgent?: string | null;
}): { key: string; type: JobViewerType } {
  if (input.seekerId) {
    return { key: `seeker:${input.seekerId.toString()}`, type: 'seeker' };
  }
  if (input.userId) {
    return { key: `cu:${input.userId.toString()}`, type: 'company_user' };
  }
  const fingerprint = `${input.ip ?? '0.0.0.0'}|${input.userAgent ?? 'unknown'}`;
  const hash = crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0, 32);
  return { key: `anon:${hash}`, type: 'anon' };
}
