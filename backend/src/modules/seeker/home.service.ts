import mongoose from 'mongoose';
import {
  Job,
  JobSkill,
  SeekerProfile,
  SeekerSkill,
  SkillTag,
  WorkExperience,
  Application,
  CompanyBranch,
  HomeFeedEvent,
  SystemConfig,
} from '../../models/index.js';
import { redis } from '../../config/redis.js';
import { geocodeService } from '../shared/geocode.service.js';
import {
  rankJobsForSeeker,
  LlmRankSeeker,
  LlmRankJob,
} from '../shared/llm-recommendation.service.js';
import type { HomeFeedEventType, HomeFeedSource } from '../../models/HomeFeedEvent.js';

const RECO_CACHE_PREFIX = 'home:reco:';
const NEARBY_CACHE_PREFIX = 'home:nearby:';
const RECO_TTL = 60 * 30; // 30 min
const NEARBY_TTL = 60 * 60; // 1 hour
const CANDIDATE_LIMIT = 30; // bounded by LLM prompt budget
const DEFAULT_NEARBY_RECENCY_DAYS = 14;
const DEFAULT_NEARBY_RADIUS_KM = 50;
const DISMISS_WINDOW_DAYS = 30;
const DISMISS_CAP = 50;

interface CoordHint {
  latitude: number;
  longitude: number;
}

interface FeedOptions {
  recoLimit?: number;
  nearbyLimit?: number;
  coords?: CoordHint | null;
}

export interface RecommendedJobItem {
  _id: string;
  title: string;
  slug?: string;
  description?: string;
  job_type?: string;
  work_mode?: string;
  experience_level?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  locations: unknown[];
  company: { _id: string; name: string; slug?: string; logo_url?: string };
  createdAt?: Date;
  match_score?: number;
  match_reason?: string;
  distance_km?: number;
}

export interface NearbyCompanyItem {
  company_id: string;
  name: string;
  slug?: string;
  logo_url?: string;
  industry?: string;
  nearest_branch: { city: string; distance_km: number };
  new_openings_count: number;
  sample_jobs: { _id: string; title: string; posted_days_ago: number }[];
}

export interface HomeFeedResponse {
  recommended_jobs: RecommendedJobItem[];
  nearby_companies: NearbyCompanyItem[];
  used_coords_source: 'browser' | 'profile' | 'geocode' | 'none';
  has_profile_signals: boolean;
}

interface CandidateJob extends LlmRankJob {
  _raw: any;
  createdAt?: Date;
  distance_meters?: number;
}

interface SeekerSnapshot extends LlmRankSeeker {
  profile: any;
}

function recoCacheKey(seekerId: string, coords?: CoordHint | null): string {
  if (coords) {
    return `${RECO_CACHE_PREFIX}${seekerId}:${coords.latitude.toFixed(2)},${coords.longitude.toFixed(2)}`;
  }
  return `${RECO_CACHE_PREFIX}${seekerId}:nogeo`;
}
function nearbyCacheKey(seekerId: string, coords: CoordHint): string {
  return `${NEARBY_CACHE_PREFIX}${seekerId}:${coords.latitude.toFixed(3)},${coords.longitude.toFixed(3)}`;
}

function yearsBetween(start?: Date | null, end?: Date | null): number {
  if (!start) return 0;
  const startTs = new Date(start).getTime();
  const endTs = end ? new Date(end).getTime() : Date.now();
  if (endTs <= startTs) return 0;
  return (endTs - startTs) / (1000 * 60 * 60 * 24 * 365.25);
}

async function getSystemNumber(key: string, fallback: number): Promise<number> {
  try {
    const doc = await SystemConfig.findOne({ key }).lean();
    if (doc && typeof doc.value === 'number') return doc.value;
    if (doc && typeof doc.value === 'string') {
      const n = Number(doc.value);
      if (!Number.isNaN(n)) return n;
    }
  } catch {}
  return fallback;
}

class HomeService {
  /**
   * Resolve seeker coordinates following the priority chain:
   *   browser hint → profile lat/lng → cached/google geocode of city → null.
   * If the geocode step succeeds and the profile has no coords, we persist
   * them back so future requests skip the lookup entirely.
   */
  private async resolveCoords(
    seekerProfileId: string,
    profile: { latitude?: number; longitude?: number; city?: string; state?: string; country?: string } | null,
    hint?: CoordHint | null
  ): Promise<{ coords: CoordHint | null; source: HomeFeedResponse['used_coords_source'] }> {
    if (hint && Number.isFinite(hint.latitude) && Number.isFinite(hint.longitude)) {
      return { coords: hint, source: 'browser' };
    }
    if (profile?.latitude != null && profile?.longitude != null) {
      return {
        coords: { latitude: profile.latitude, longitude: profile.longitude },
        source: 'profile',
      };
    }
    if (profile?.city) {
      const geo = await geocodeService.geocodeCity({
        city: profile.city,
        state: profile.state,
        country: profile.country,
      });
      if (geo) {
        // Persist back so we don't geocode this seeker again
        SeekerProfile.findByIdAndUpdate(seekerProfileId, {
          $set: { latitude: geo.latitude, longitude: geo.longitude },
        }).catch(() => {});
        return { coords: geo, source: 'geocode' };
      }
    }
    return { coords: null, source: 'none' };
  }

  private async loadSeekerSnapshot(seekerProfileId: string): Promise<SeekerSnapshot> {
    const seekerObjId = new mongoose.Types.ObjectId(seekerProfileId);
    const [profile, skills, experiences, recentApplications] = await Promise.all([
      SeekerProfile.findById(seekerObjId).lean(),
      SeekerSkill.find({ seeker_id: seekerObjId }).select('skill_tag_id').lean(),
      WorkExperience.find({ seeker_id: seekerObjId }).select('job_title start_date end_date is_current').lean(),
      Application.find({ seeker_id: seekerObjId })
        .sort({ applied_at: -1 })
        .limit(20)
        .populate('job_id', 'company_id')
        .lean(),
    ]);

    const skillTagIds = skills.map((s) => s.skill_tag_id);
    const skillTagDocs = skillTagIds.length
      ? await SkillTag.find({ _id: { $in: skillTagIds } }).select('name').lean()
      : [];
    const skillNameById = new Map<string, string>(
      skillTagDocs.map((d) => [d._id.toString(), d.name])
    );
    const skill_names = skillTagIds
      .map((id) => skillNameById.get(id.toString()))
      .filter((n): n is string => !!n);

    const totalYears = experiences.reduce(
      (sum, exp) => sum + yearsBetween(exp.start_date, exp.is_current ? null : exp.end_date),
      0
    );

    const recentTitles = experiences
      .map((e) => e.job_title)
      .filter((t): t is string => !!t)
      .slice(0, 3);

    const appliedCompanyIds: string[] = [];
    const appliedJobIds: mongoose.Types.ObjectId[] = [];
    for (const app of recentApplications) {
      const job = app.job_id as unknown as { _id?: mongoose.Types.ObjectId; company_id?: mongoose.Types.ObjectId } | null;
      if (job?.company_id) appliedCompanyIds.push(job.company_id.toString());
      if (job?._id) appliedJobIds.push(job._id);
    }

    let appliedSkillNames: string[] = [];
    if (appliedJobIds.length > 0) {
      const appliedJobSkills = await JobSkill.find({ job_id: { $in: appliedJobIds } })
        .select('skill_tag_id')
        .lean();
      const uniqueAppliedTagIds = Array.from(
        new Set(appliedJobSkills.map((js) => js.skill_tag_id.toString()))
      );
      if (uniqueAppliedTagIds.length > 0) {
        const tags = await SkillTag.find({
          _id: { $in: uniqueAppliedTagIds.map((id) => new mongoose.Types.ObjectId(id)) },
        })
          .select('name')
          .lean();
        appliedSkillNames = tags.map((t) => t.name).filter(Boolean);
      }
    }

    return {
      profile,
      skill_names,
      headline: profile?.headline,
      recent_titles: recentTitles,
      total_experience_years: totalYears > 0 ? totalYears : undefined,
      city: profile?.city,
      preferred_work_mode: profile?.preferred_work_mode,
      preferred_job_types: profile?.preferred_job_types,
      expected_salary_min: profile?.expected_salary_min,
      expected_salary_max: profile?.expected_salary_max,
      expected_salary_currency: profile?.expected_salary_currency,
      applied_company_ids: appliedCompanyIds,
      applied_skill_names: appliedSkillNames,
    };
  }

  private async loadCandidateJobs(
    seeker: SeekerSnapshot,
    excludeJobIds: mongoose.Types.ObjectId[],
    coords?: CoordHint | null
  ): Promise<CandidateJob[]> {
    const seekerSkillNameSet = new Set(seeker.skill_names.map((s) => s.toLowerCase()));

    const baseMatch: Record<string, unknown> = { status: 'active' };
    if (excludeJobIds.length > 0) baseMatch._id = { $nin: excludeJobIds };

    const pipeline: Record<string, unknown>[] = [];

    if (coords) {
      pipeline.push({
        $geoNear: {
          near: { type: 'Point', coordinates: [coords.longitude, coords.latitude] },
          distanceField: 'distance_meters',
          spherical: true,
          query: baseMatch,
        },
      });
    } else {
      pipeline.push({ $match: baseMatch });
    }

    // Join job_skills, then join skill_tags so we can hand the LLM real names.
    pipeline.push({
      $lookup: {
        from: 'jobskills',
        localField: '_id',
        foreignField: 'job_id',
        as: 'jobSkills',
      },
    });
    pipeline.push({
      $lookup: {
        from: 'skilltags',
        localField: 'jobSkills.skill_tag_id',
        foreignField: '_id',
        as: 'skillTags',
      },
    });
    pipeline.push({
      $addFields: {
        skill_tag_ids: '$jobSkills.skill_tag_id',
        required_skill_tag_ids: {
          $map: {
            input: { $filter: { input: '$jobSkills', as: 'js', cond: { $eq: ['$$js.is_required', true] } } },
            as: 'js',
            in: '$$js.skill_tag_id',
          },
        },
      },
    });

    // When the seeker has skills, prefilter to jobs that overlap by skill name
    // (case-insensitive). Otherwise, fall through to recency.
    if (seekerSkillNameSet.size > 0) {
      pipeline.push({
        $addFields: {
          matchCount: {
            $size: {
              $filter: {
                input: '$skillTags.name',
                as: 'n',
                cond: {
                  $in: [{ $toLower: '$$n' }, Array.from(seekerSkillNameSet)],
                },
              },
            },
          },
        },
      });
      pipeline.push({ $match: { matchCount: { $gt: 0 } } });
      pipeline.push({ $sort: { matchCount: -1, createdAt: -1 } });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push({ $limit: CANDIDATE_LIMIT });

    pipeline.push({
      $lookup: {
        from: 'companies',
        localField: 'company_id',
        foreignField: '_id',
        as: 'company',
      },
    });
    pipeline.push({ $unwind: '$company' });
    pipeline.push({ $match: { 'company.approval_status': 'approved' } });

    pipeline.push({
      $project: {
        title: 1,
        slug: 1,
        description: 1,
        job_type: 1,
        work_mode: 1,
        experience_level: 1,
        experience_min_years: 1,
        experience_max_years: 1,
        salary_min: 1,
        salary_max: 1,
        salary_currency: 1,
        locations: 1,
        createdAt: 1,
        company_id: 1,
        company: { _id: '$company._id', name: '$company.name', slug: '$company.slug', logo_url: '$company.logo_url' },
        distance_meters: 1,
        skill_names: '$skillTags.name',
        required_skill_tag_ids: 1,
        skill_tag_ids: 1,
        skill_tags_full: '$skillTags',
        jobSkills: 1,
      },
    });

    // Mongoose's PipelineStage union over-narrows generic stage shapes; cast
    // through unknown like the sibling services do.
    const docs = await Job.aggregate(pipeline as unknown as Parameters<typeof Job.aggregate>[0]);

    const now = Date.now();
    return docs.map((d): CandidateJob => {
      const requiredIdSet = new Set(
        ((d.required_skill_tag_ids ?? []) as mongoose.Types.ObjectId[]).map((x) => x.toString())
      );
      const allTags = (d.skill_tags_full ?? []) as { _id: mongoose.Types.ObjectId; name: string }[];
      const required_skill_names: string[] = [];
      const optional_skill_names: string[] = [];
      for (const t of allTags) {
        if (!t?.name) continue;
        if (requiredIdSet.has(t._id.toString())) required_skill_names.push(t.name);
        else optional_skill_names.push(t.name);
      }

      const distance_meters = typeof d.distance_meters === 'number' ? d.distance_meters : undefined;
      const distance_km = distance_meters != null ? Math.round(distance_meters / 100) / 10 : undefined;
      const posted_days_ago = d.createdAt
        ? Math.max(0, Math.floor((now - new Date(d.createdAt).getTime()) / 86400000))
        : undefined;

      return {
        _id: d._id.toString(),
        title: d.title,
        description: d.description,
        experience_level: d.experience_level,
        experience_min_years: d.experience_min_years,
        experience_max_years: d.experience_max_years,
        job_type: d.job_type,
        work_mode: d.work_mode,
        salary_min: d.salary_min,
        salary_max: d.salary_max,
        salary_currency: d.salary_currency,
        primary_city: Array.isArray(d.locations) && d.locations.length > 0 ? d.locations[0]?.city : undefined,
        distance_km,
        posted_days_ago,
        required_skill_names,
        optional_skill_names,
        company_id: d.company_id?.toString(),
        createdAt: d.createdAt,
        distance_meters,
        _raw: d,
      };
    });
  }

  private getActiveDismissedIds(profile: { last_dismissed_jobs?: { job_id: mongoose.Types.ObjectId; dismissed_at: Date }[] } | null): mongoose.Types.ObjectId[] {
    if (!profile?.last_dismissed_jobs) return [];
    const cutoff = Date.now() - DISMISS_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return profile.last_dismissed_jobs
      .filter((d) => new Date(d.dismissed_at).getTime() >= cutoff)
      .map((d) => d.job_id);
  }

  private buildItem(c: CandidateJob, score: number | undefined, reason: string | undefined): RecommendedJobItem {
    const raw = c._raw;
    return {
      _id: c._id,
      title: c.title,
      slug: raw?.slug,
      description: raw?.description,
      job_type: c.job_type,
      work_mode: c.work_mode,
      experience_level: c.experience_level,
      salary_min: c.salary_min,
      salary_max: c.salary_max,
      salary_currency: c.salary_currency,
      locations: raw?.locations ?? [],
      company: raw?.company ?? { _id: '', name: '' },
      createdAt: c.createdAt ? new Date(c.createdAt) : undefined,
      match_score: score,
      match_reason: reason,
      distance_km: c.distance_km,
    };
  }

  /**
   * Compute recommended jobs for a seeker. Candidates come from a Mongo
   * aggregation (skill prefilter + geo + active + approved). The final order
   * and per-job score/reason are produced by an OpenAI call. If the LLM call
   * fails (no key, network, parse error), we fall back to the aggregation
   * order so the feed never breaks.
   */
  async getRecommendedJobs(
    seekerProfileId: string,
    options: { limit?: number; coords?: CoordHint | null } = {}
  ): Promise<{ items: RecommendedJobItem[]; has_profile_signals: boolean }> {
    const limit = Math.min(50, Math.max(1, options.limit ?? 12));
    const coords = options.coords ?? null;

    const cacheKey = recoCacheKey(seekerProfileId, coords);
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed?.items)) return parsed;
      }
    } catch {}

    const seeker = await this.loadSeekerSnapshot(seekerProfileId);
    const dismissed = this.getActiveDismissedIds(seeker.profile);

    // Exclude already-applied jobs and dismissed jobs
    const appliedRows = await Application.find({ seeker_id: new mongoose.Types.ObjectId(seekerProfileId) })
      .select('job_id')
      .lean();
    const excludeIds = [
      ...appliedRows.map((a) => a.job_id),
      ...dismissed,
    ];

    const candidates = await this.loadCandidateJobs(seeker, excludeIds, coords);

    const hasSignals = seeker.skill_names.length > 0 || (seeker.total_experience_years ?? 0) > 0;

    let items: RecommendedJobItem[];

    if (candidates.length === 0) {
      items = [];
    } else if (!hasSignals) {
      // Cold start: nothing for the LLM to reason about. Surface freshest jobs.
      const sorted = [...candidates].sort((a, b) => {
        const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bd - ad;
      });
      items = sorted.slice(0, limit).map((c) => this.buildItem(c, undefined, undefined));
    } else {
      const ranked = await rankJobsForSeeker(seeker, candidates, limit);
      if (ranked && ranked.length > 0) {
        const byId = new Map(candidates.map((c) => [c._id, c]));
        const ordered: RecommendedJobItem[] = [];
        // Quality gate: only surface jobs the LLM scored above 50.
        const sortedRanked = [...ranked]
          .filter((r) => r.score > 50)
          .sort((a, b) => b.score - a.score);
        for (const r of sortedRanked) {
          const c = byId.get(r.job_id);
          if (!c) continue;
          ordered.push(this.buildItem(c, r.score, r.reason));
          if (ordered.length >= limit) break;
        }
        items = ordered;
      } else {
        // LLM failed — keep aggregation order (matchCount desc, then recency).
        items = candidates.slice(0, limit).map((c) => this.buildItem(c, undefined, undefined));
      }
    }

    const payload = { items, has_profile_signals: hasSignals };
    try {
      await redis.set(cacheKey, JSON.stringify(payload), 'EX', RECO_TTL);
    } catch {}
    return payload;
  }

  /**
   * Companies near the seeker that have posted active jobs in the last
   * `nearby_recency_days`. Aggregation is keyed off CompanyBranch for the
   * 2dsphere index — companies don't store location directly.
   */
  async getNearbyCompanies(
    seekerProfileId: string,
    options: { coords: CoordHint; limit?: number; radiusKm?: number; recencyDays?: number }
  ): Promise<NearbyCompanyItem[]> {
    const limit = Math.min(20, Math.max(1, options.limit ?? 8));
    const cacheKey = nearbyCacheKey(seekerProfileId, options.coords);
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}

    const radiusKm = options.radiusKm ?? (await getSystemNumber('home.nearby_radius_km', DEFAULT_NEARBY_RADIUS_KM));
    const recencyDays = options.recencyDays ?? (await getSystemNumber('home.nearby_recency_days', DEFAULT_NEARBY_RECENCY_DAYS));

    const since = new Date(Date.now() - recencyDays * 24 * 60 * 60 * 1000);

    const pipeline: Record<string, unknown>[] = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [options.coords.longitude, options.coords.latitude] },
          distanceField: 'distance_meters',
          maxDistance: radiusKm * 1000,
          spherical: true,
          query: { is_active: true },
        },
      },
      {
        $lookup: {
          from: 'jobs',
          let: { branch_id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$status', 'active'] },
                    { $gte: ['$createdAt', since] },
                    {
                      $in: [
                        '$$branch_id',
                        {
                          $map: {
                            input: { $ifNull: ['$locations', []] },
                            as: 'loc',
                            in: '$$loc.branch_id',
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
            { $project: { _id: 1, title: 1, createdAt: 1 } },
          ],
          as: 'recent_jobs',
        },
      },
      { $match: { 'recent_jobs.0': { $exists: true } } },
      {
        $lookup: {
          from: 'companies',
          localField: 'company_id',
          foreignField: '_id',
          as: 'company',
        },
      },
      { $unwind: '$company' },
      { $match: { 'company.approval_status': 'approved' } },
      {
        $group: {
          _id: '$company._id',
          company: { $first: '$company' },
          nearest_distance: { $min: '$distance_meters' },
          nearest_city: { $first: '$city' },
          recent_jobs: { $push: '$recent_jobs' },
        },
      },
      {
        $addFields: {
          all_recent_jobs: {
            $reduce: {
              input: '$recent_jobs',
              initialValue: [],
              in: { $concatArrays: ['$$value', '$$this'] },
            },
          },
        },
      },
      {
        $addFields: {
          new_openings_count: { $size: '$all_recent_jobs' },
          sample_jobs: { $slice: ['$all_recent_jobs', 3] },
        },
      },
      { $sort: { new_openings_count: -1, nearest_distance: 1 } },
      { $limit: limit },
    ];

    const rows = await CompanyBranch.aggregate(pipeline as unknown as Parameters<typeof CompanyBranch.aggregate>[0]);

    const now = Date.now();
    const items: NearbyCompanyItem[] = rows.map((r: any) => ({
      company_id: r._id.toString(),
      name: r.company.name,
      slug: r.company.slug,
      logo_url: r.company.logo_url,
      industry: r.company.industry,
      nearest_branch: {
        city: r.nearest_city,
        distance_km: Math.round((r.nearest_distance / 100)) / 10,
      },
      new_openings_count: r.new_openings_count,
      sample_jobs: (r.sample_jobs ?? []).map((j: any) => ({
        _id: j._id.toString(),
        title: j.title,
        posted_days_ago: Math.max(0, Math.floor((now - new Date(j.createdAt).getTime()) / (1000 * 60 * 60 * 24))),
      })),
    }));

    try {
      await redis.set(cacheKey, JSON.stringify(items), 'EX', NEARBY_TTL);
    } catch {}
    return items;
  }

  async getFeed(seekerProfileId: string, options: FeedOptions = {}): Promise<HomeFeedResponse> {
    const profile = await SeekerProfile.findById(seekerProfileId)
      .select('latitude longitude city state country last_dismissed_jobs')
      .lean();
    const { coords, source } = await this.resolveCoords(seekerProfileId, profile, options.coords);

    const [reco, nearby] = await Promise.all([
      this.getRecommendedJobs(seekerProfileId, { limit: options.recoLimit ?? 12, coords }),
      coords
        ? this.getNearbyCompanies(seekerProfileId, { coords, limit: options.nearbyLimit ?? 8 })
        : Promise.resolve<NearbyCompanyItem[]>([]),
    ]);

    return {
      recommended_jobs: reco.items,
      nearby_companies: nearby,
      used_coords_source: source,
      has_profile_signals: reco.has_profile_signals,
    };
  }

  async dismissJob(seekerProfileId: string, jobId: string): Promise<void> {
    if (!mongoose.isValidObjectId(jobId)) return;
    const cutoff = new Date(Date.now() - DISMISS_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    await SeekerProfile.findByIdAndUpdate(seekerProfileId, [
      {
        $set: {
          last_dismissed_jobs: {
            $let: {
              vars: {
                pruned: {
                  $filter: {
                    input: { $ifNull: ['$last_dismissed_jobs', []] },
                    as: 'd',
                    cond: {
                      $and: [
                        { $gte: ['$$d.dismissed_at', cutoff] },
                        { $ne: ['$$d.job_id', new mongoose.Types.ObjectId(jobId)] },
                      ],
                    },
                  },
                },
              },
              in: {
                $slice: [
                  {
                    $concatArrays: [
                      [{ job_id: new mongoose.Types.ObjectId(jobId), dismissed_at: new Date() }],
                      '$$pruned',
                    ],
                  },
                  DISMISS_CAP,
                ],
              },
            },
          },
        },
      },
    ]);
    await this.invalidateRecoCache(seekerProfileId);
  }

  async track(
    seekerProfileId: string,
    payload: { type: HomeFeedEventType; source: HomeFeedSource; job_id?: string; company_id?: string; score?: number; position?: number }
  ): Promise<void> {
    try {
      await HomeFeedEvent.create({
        seeker_id: new mongoose.Types.ObjectId(seekerProfileId),
        type: payload.type,
        source: payload.source,
        job_id: payload.job_id && mongoose.isValidObjectId(payload.job_id) ? new mongoose.Types.ObjectId(payload.job_id) : undefined,
        company_id: payload.company_id && mongoose.isValidObjectId(payload.company_id) ? new mongoose.Types.ObjectId(payload.company_id) : undefined,
        score: payload.score,
        position: payload.position,
      });
    } catch {
      // telemetry is fire-and-forget; never surface failures to the caller
    }
  }

  /** Wipe all reco cache entries for a seeker (geo-sharded keys included). */
  async invalidateRecoCache(seekerProfileId: string): Promise<void> {
    try {
      const stream = redis.scanStream({ match: `${RECO_CACHE_PREFIX}${seekerProfileId}:*`, count: 100 });
      const keys: string[] = [];
      for await (const batch of stream) {
        keys.push(...(batch as string[]));
      }
      if (keys.length > 0) await redis.del(...keys);
    } catch {}
  }

  async invalidateNearbyCache(seekerProfileId: string): Promise<void> {
    try {
      const stream = redis.scanStream({ match: `${NEARBY_CACHE_PREFIX}${seekerProfileId}:*`, count: 100 });
      const keys: string[] = [];
      for await (const batch of stream) {
        keys.push(...(batch as string[]));
      }
      if (keys.length > 0) await redis.del(...keys);
    } catch {}
  }

  async invalidateAllForSeeker(seekerProfileId: string): Promise<void> {
    await Promise.all([
      this.invalidateRecoCache(seekerProfileId),
      this.invalidateNearbyCache(seekerProfileId),
    ]);
  }
}

export const homeService = new HomeService();
export default homeService;
