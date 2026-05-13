import mongoose from 'mongoose';
import crypto from 'crypto';
import {
  Job,
  JobSkill,
  SeekerProfile,
  SeekerSkill,
  SkillTag,
  WorkExperience,
  CompanyBranch,
  Application,
  Company,
  User,
  JobInvite,
} from '../../models/index.js';
import type { JobInviteStatus } from '../../models/JobInvite.js';
import config from '../../config/env.js';
import { redis } from '../../config/redis.js';
import { getOpenAI, OPENAI_MODEL } from '../../config/openai.js';
import { emailService } from '../shared/email.service.js';
import { notificationService } from '../shared/notification.service.js';
import { withCache, hashKey, bustCachePattern } from '../../lib/cache.js';

const EXPLAIN_CACHE_PREFIX = 'company:insights:explain:';
const EXPLAIN_TTL = 60 * 60 * 24; // 24h
const DEFAULT_NEARBY_RADIUS_KM = 50;
const DEFAULT_NEARBY_RECENCY_DAYS = 90;
const SUGGEST_SCAN_LIMIT = 200;

// Listing endpoints scan up to ~200 seekers and run scoring per (seeker, job).
// 5 minutes is a sweet spot: instant repeat loads on the same dashboard, but
// short enough that newly-active seekers / new jobs surface quickly.
const INSIGHTS_LIST_TTL = 5 * 60;
const SUGGEST_CACHE_PREFIX = 'company:insights:suggested:';
const NEARBY_CACHE_PREFIX = 'company:insights:nearby:';
const SUMMARY_CACHE_PREFIX = 'company:insights:summary:';

export interface SuggestedSeekerItem {
  seeker_id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  headline?: string;
  city?: string;
  avatar_url?: string;
  skills: string[];
  matched_skills: string[];
  total_experience_years?: number;
  score: number;
  score_breakdown: {
    skill_overlap: number;
    required_overlap: number;
    experience_fit: number;
  };
  best_job: { id: string; title: string };
  visibility: string;
  has_applied_already: boolean;
}

export interface NearbySeekerItem {
  seeker_id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  headline?: string;
  city?: string;
  avatar_url?: string;
  skills: string[];
  distance_km: number;
  nearest_branch: { id: string; name: string; city: string };
  updated_at?: Date;
}

export interface InsightsSummary {
  active_jobs: number;
  total_matches: number;
  strong_matches: number;
  nearby_seekers: number;
  insights: string[];
  top_growing_skills: { name: string; seeker_count: number }[];
}

interface SeekerSnapshot {
  _id: mongoose.Types.ObjectId;
  user_id?: mongoose.Types.ObjectId;
  first_name?: string;
  last_name?: string;
  headline?: string;
  city?: string;
  avatar_url?: string;
  visibility: string;
  latitude?: number;
  longitude?: number;
  updatedAt?: Date;
  skill_tag_ids: string[];
  skill_names: string[];
  total_experience_years: number;
}

interface JobSnapshot {
  _id: string;
  title: string;
  required_skill_tag_ids: Set<string>;
  optional_skill_tag_ids: Set<string>;
  experience_min_years?: number;
  experience_max_years?: number;
}

function yearsBetween(start?: Date | null, end?: Date | null): number {
  if (!start) return 0;
  const startTs = new Date(start).getTime();
  const endTs = end ? new Date(end).getTime() : Date.now();
  if (endTs <= startTs) return 0;
  return (endTs - startTs) / (1000 * 60 * 60 * 24 * 365.25);
}

async function loadActiveJobsWithSkills(companyId: string): Promise<JobSnapshot[]> {
  const jobs = await Job.find({
    company_id: new mongoose.Types.ObjectId(companyId),
    status: 'active',
  })
    .select('_id title experience_min_years experience_max_years')
    .lean();
  if (jobs.length === 0) return [];

  const jobIds = jobs.map((j) => j._id);
  const jobSkills = await JobSkill.find({ job_id: { $in: jobIds } })
    .select('job_id skill_tag_id is_required')
    .lean();

  const required = new Map<string, Set<string>>();
  const optional = new Map<string, Set<string>>();
  for (const js of jobSkills) {
    const jid = js.job_id.toString();
    const tag = js.skill_tag_id.toString();
    const target = js.is_required ? required : optional;
    let bucket = target.get(jid);
    if (!bucket) {
      bucket = new Set();
      target.set(jid, bucket);
    }
    bucket.add(tag);
  }

  return jobs.map((j) => ({
    _id: j._id.toString(),
    title: j.title,
    required_skill_tag_ids: required.get(j._id.toString()) ?? new Set(),
    optional_skill_tag_ids: optional.get(j._id.toString()) ?? new Set(),
    experience_min_years: j.experience_min_years,
    experience_max_years: j.experience_max_years,
  }));
}

async function loadSeekerCandidates(
  jobs: JobSnapshot[],
  hardLimit: number
): Promise<SeekerSnapshot[]> {
  const allSkillIds = new Set<string>();
  for (const j of jobs) {
    j.required_skill_tag_ids.forEach((s) => allSkillIds.add(s));
    j.optional_skill_tag_ids.forEach((s) => allSkillIds.add(s));
  }
  if (allSkillIds.size === 0) return [];

  const skillObjectIds = Array.from(allSkillIds).map((id) => new mongoose.Types.ObjectId(id));
  const matchingSeekerSkills = await SeekerSkill.find({
    skill_tag_id: { $in: skillObjectIds },
  })
    .select('seeker_id skill_tag_id')
    .lean();

  const seekerSkillMap = new Map<string, string[]>();
  for (const ss of matchingSeekerSkills) {
    const sid = ss.seeker_id.toString();
    let arr = seekerSkillMap.get(sid);
    if (!arr) {
      arr = [];
      seekerSkillMap.set(sid, arr);
    }
    arr.push(ss.skill_tag_id.toString());
  }
  if (seekerSkillMap.size === 0) return [];

  const seekerIds = Array.from(seekerSkillMap.keys()).slice(0, hardLimit);
  const seekerObjIds = seekerIds.map((id) => new mongoose.Types.ObjectId(id));

  const profiles = await SeekerProfile.find({
    _id: { $in: seekerObjIds },
    visibility: { $in: ['public', 'companies_only'] },
  })
    .select(
      '_id user_id first_name last_name headline city avatar_url visibility latitude longitude updatedAt'
    )
    .lean();

  const visibleIds = profiles.map((p) => p._id);
  const allSeekerSkills = await SeekerSkill.find({ seeker_id: { $in: visibleIds } })
    .select('seeker_id skill_tag_id')
    .lean();
  const fullSkillMap = new Map<string, string[]>();
  for (const ss of allSeekerSkills) {
    const sid = ss.seeker_id.toString();
    let arr = fullSkillMap.get(sid);
    if (!arr) {
      arr = [];
      fullSkillMap.set(sid, arr);
    }
    arr.push(ss.skill_tag_id.toString());
  }

  const allTagIds = new Set<string>();
  fullSkillMap.forEach((arr) => arr.forEach((t) => allTagIds.add(t)));
  const tags = allTagIds.size
    ? await SkillTag.find({
        _id: { $in: Array.from(allTagIds).map((id) => new mongoose.Types.ObjectId(id)) },
      })
        .select('_id name')
        .lean()
    : [];
  const tagNameById = new Map<string, string>(tags.map((t) => [t._id.toString(), t.name]));

  const experiences = await WorkExperience.find({ seeker_id: { $in: visibleIds } })
    .select('seeker_id start_date end_date is_current')
    .lean();
  const experienceMap = new Map<string, number>();
  for (const exp of experiences) {
    const sid = exp.seeker_id.toString();
    const years = yearsBetween(exp.start_date, exp.is_current ? null : exp.end_date);
    experienceMap.set(sid, (experienceMap.get(sid) ?? 0) + years);
  }

  return profiles.map((p) => {
    const sid = p._id.toString();
    const tagIds = fullSkillMap.get(sid) ?? [];
    const skillNames = tagIds
      .map((t) => tagNameById.get(t))
      .filter((n): n is string => !!n);
    return {
      _id: p._id,
      user_id: p.user_id,
      first_name: p.first_name,
      last_name: p.last_name,
      headline: p.headline,
      city: p.city,
      avatar_url: p.avatar_url,
      visibility: p.visibility,
      latitude: p.latitude,
      longitude: p.longitude,
      updatedAt: p.updatedAt,
      skill_tag_ids: tagIds,
      skill_names: skillNames,
      total_experience_years: experienceMap.get(sid) ?? 0,
    };
  });
}

function scoreSeekerForJob(
  seeker: SeekerSnapshot,
  job: JobSnapshot,
  tagNameById: Map<string, string>
): { total: number; required_overlap: number; skill_overlap: number; experience_fit: number; matched_skills: string[] } {
  const seekerSet = new Set(seeker.skill_tag_ids);
  let requiredOverlap = 0;
  let optionalOverlap = 0;
  const matched: string[] = [];

  job.required_skill_tag_ids.forEach((id) => {
    if (seekerSet.has(id)) {
      requiredOverlap += 1;
      const name = tagNameById.get(id);
      if (name) matched.push(name);
    }
  });
  job.optional_skill_tag_ids.forEach((id) => {
    if (seekerSet.has(id)) {
      optionalOverlap += 1;
      const name = tagNameById.get(id);
      if (name) matched.push(name);
    }
  });

  const requiredTotal = job.required_skill_tag_ids.size || 1;
  const requiredCoverage = requiredOverlap / requiredTotal;

  let experienceFit = 0;
  const min = job.experience_min_years ?? 0;
  const max = job.experience_max_years ?? Number.POSITIVE_INFINITY;
  const years = seeker.total_experience_years;
  if (years >= min && years <= max) experienceFit = 1;
  else if (years >= min * 0.7 && years <= (Number.isFinite(max) ? max * 1.3 : years + 1)) experienceFit = 0.5;

  const total = Math.round(
    requiredCoverage * 60 + Math.min(optionalOverlap, 5) * 4 + experienceFit * 20
  );

  return {
    total,
    required_overlap: requiredOverlap,
    skill_overlap: requiredOverlap + optionalOverlap,
    experience_fit: experienceFit,
    matched_skills: matched,
  };
}

export const insightsService = {
  /**
   * Suggested seekers ranked by skill overlap + experience fit. If jobId is
   * passed, scope to that job; otherwise pick each seeker's best-matching
   * active job and rank globally.
   */
  async getSuggestedSeekers(params: {
    companyId: string;
    jobId?: string;
    limit?: number;
  }): Promise<{ items: SuggestedSeekerItem[]; total: number }> {
    const cacheKey = `${SUGGEST_CACHE_PREFIX}${params.companyId}:${hashKey({
      jobId: params.jobId ?? null,
      limit: params.limit ?? 20,
    })}`;
    return withCache(cacheKey, INSIGHTS_LIST_TTL, () =>
      this.getSuggestedSeekersFresh(params)
    );
  },

  async getSuggestedSeekersFresh(params: {
    companyId: string;
    jobId?: string;
    limit?: number;
  }): Promise<{ items: SuggestedSeekerItem[]; total: number }> {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);
    let jobs = await loadActiveJobsWithSkills(params.companyId);
    if (params.jobId) {
      jobs = jobs.filter((j) => j._id === params.jobId);
    }
    if (jobs.length === 0) return { items: [], total: 0 };

    const seekers = await loadSeekerCandidates(jobs, SUGGEST_SCAN_LIMIT);
    if (seekers.length === 0) return { items: [], total: 0 };

    // Build a tag name lookup spanning every tag used by any candidate seeker
    // OR any active job — needed to label matched skills regardless of which
    // side originated them.
    const allTagIds = new Set<string>();
    seekers.forEach((s) => s.skill_tag_ids.forEach((t) => allTagIds.add(t)));
    jobs.forEach((j) => {
      j.required_skill_tag_ids.forEach((t) => allTagIds.add(t));
      j.optional_skill_tag_ids.forEach((t) => allTagIds.add(t));
    });
    const tags = allTagIds.size
      ? await SkillTag.find({
          _id: { $in: Array.from(allTagIds).map((id) => new mongoose.Types.ObjectId(id)) },
        })
          .select('_id name')
          .lean()
      : [];
    const tagNameById = new Map<string, string>(tags.map((t) => [t._id.toString(), t.name]));

    // Application existence per seeker for jobs in scope
    const seekerObjIds = seekers.map((s) => s._id);
    const jobObjIds = jobs.map((j) => new mongoose.Types.ObjectId(j._id));
    const existingApps = await Application.find({
      seeker_id: { $in: seekerObjIds },
      job_id: { $in: jobObjIds },
    })
      .select('seeker_id')
      .lean();
    const appliedSet = new Set(existingApps.map((a) => a.seeker_id.toString()));

    const ranked: SuggestedSeekerItem[] = [];
    for (const s of seekers) {
      let bestJob: JobSnapshot | null = null;
      let bestScore = scoreSeekerForJob(s, jobs[0], tagNameById);
      bestJob = jobs[0];
      for (let i = 1; i < jobs.length; i += 1) {
        const candidate = scoreSeekerForJob(s, jobs[i], tagNameById);
        if (candidate.total > bestScore.total) {
          bestScore = candidate;
          bestJob = jobs[i];
        }
      }
      if (!bestJob || bestScore.total <= 0) continue;
      ranked.push({
        seeker_id: s._id.toString(),
        user_id: s.user_id?.toString() ?? '',
        first_name: s.first_name,
        last_name: s.last_name,
        headline: s.headline,
        city: s.city,
        avatar_url: s.avatar_url,
        skills: s.skill_names,
        matched_skills: bestScore.matched_skills,
        total_experience_years: Number(s.total_experience_years.toFixed(1)),
        score: bestScore.total,
        score_breakdown: {
          skill_overlap: bestScore.skill_overlap,
          required_overlap: bestScore.required_overlap,
          experience_fit: bestScore.experience_fit,
        },
        best_job: { id: bestJob._id, title: bestJob.title },
        visibility: s.visibility,
        has_applied_already: appliedSet.has(s._id.toString()),
      });
    }

    ranked.sort((a, b) => b.score - a.score);
    return { items: ranked.slice(0, limit), total: ranked.length };
  },

  /**
   * Nearby seekers across all active branches via $geoNear, deduping to the
   * closest branch per seeker. Filters out hidden visibility and stale
   * profiles.
   */
  async getNearbySeekers(params: {
    companyId: string;
    radiusKm?: number;
    limit?: number;
    recencyDays?: number;
  }): Promise<{ items: NearbySeekerItem[]; total: number }> {
    const cacheKey = `${NEARBY_CACHE_PREFIX}${params.companyId}:${hashKey({
      radiusKm: params.radiusKm ?? DEFAULT_NEARBY_RADIUS_KM,
      limit: params.limit ?? 20,
      recencyDays: params.recencyDays ?? DEFAULT_NEARBY_RECENCY_DAYS,
    })}`;
    return withCache(cacheKey, INSIGHTS_LIST_TTL, () =>
      this.getNearbySeekersFresh(params)
    );
  },

  async getNearbySeekersFresh(params: {
    companyId: string;
    radiusKm?: number;
    limit?: number;
    recencyDays?: number;
  }): Promise<{ items: NearbySeekerItem[]; total: number }> {
    const radiusKm = Math.min(Math.max(params.radiusKm ?? DEFAULT_NEARBY_RADIUS_KM, 1), 500);
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);
    const recencyDays = params.recencyDays ?? DEFAULT_NEARBY_RECENCY_DAYS;

    const branches = await CompanyBranch.find({
      company_id: new mongoose.Types.ObjectId(params.companyId),
      is_active: true,
    })
      .select('_id name city latitude longitude location')
      .lean();
    if (branches.length === 0) return { items: [], total: 0 };

    const since = new Date(Date.now() - recencyDays * 24 * 60 * 60 * 1000);
    const seenSeekers = new Map<string, NearbySeekerItem & { _distance_meters: number }>();

    for (const branch of branches) {
      if (branch.latitude == null || branch.longitude == null) continue;

      const docs = await SeekerProfile.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [branch.longitude, branch.latitude] },
            distanceField: 'distance_meters',
            spherical: true,
            maxDistance: radiusKm * 1000,
            query: {
              visibility: { $in: ['public', 'companies_only'] },
              updatedAt: { $gte: since },
            },
          },
        },
        { $limit: limit * 2 },
        {
          $project: {
            _id: 1,
            user_id: 1,
            first_name: 1,
            last_name: 1,
            headline: 1,
            city: 1,
            avatar_url: 1,
            updatedAt: 1,
            distance_meters: 1,
          },
        },
      ]);

      for (const d of docs) {
        const sid = d._id.toString();
        const distMeters = d.distance_meters;
        const existing = seenSeekers.get(sid);
        if (existing && existing._distance_meters <= distMeters) continue;
        seenSeekers.set(sid, {
          seeker_id: sid,
          user_id: d.user_id?.toString() ?? '',
          first_name: d.first_name,
          last_name: d.last_name,
          headline: d.headline,
          city: d.city,
          avatar_url: d.avatar_url,
          skills: [],
          distance_km: Math.round(distMeters / 100) / 10,
          nearest_branch: {
            id: branch._id.toString(),
            name: branch.name,
            city: branch.city,
          },
          updated_at: d.updatedAt,
          _distance_meters: distMeters,
        });
      }
    }

    const merged = Array.from(seenSeekers.values());
    merged.sort((a, b) => a._distance_meters - b._distance_meters);
    const trimmed = merged.slice(0, limit);

    if (trimmed.length > 0) {
      const seekerIds = trimmed.map((t) => new mongoose.Types.ObjectId(t.seeker_id));
      const seekerSkills = await SeekerSkill.find({ seeker_id: { $in: seekerIds } })
        .select('seeker_id skill_tag_id')
        .lean();
      const tagIds = Array.from(new Set(seekerSkills.map((ss) => ss.skill_tag_id.toString())));
      const tags = tagIds.length
        ? await SkillTag.find({
            _id: { $in: tagIds.map((id) => new mongoose.Types.ObjectId(id)) },
          })
            .select('_id name')
            .lean()
        : [];
      const tagNameById = new Map<string, string>(tags.map((t) => [t._id.toString(), t.name]));
      const skillsBySeeker = new Map<string, string[]>();
      for (const ss of seekerSkills) {
        const sid = ss.seeker_id.toString();
        const name = tagNameById.get(ss.skill_tag_id.toString());
        if (!name) continue;
        let bucket = skillsBySeeker.get(sid);
        if (!bucket) {
          bucket = [];
          skillsBySeeker.set(sid, bucket);
        }
        bucket.push(name);
      }
      for (const item of trimmed) {
        item.skills = (skillsBySeeker.get(item.seeker_id) ?? []).slice(0, 8);
      }
    }

    // Strip the internal sort key before returning
    const items: NearbySeekerItem[] = trimmed.map(({ _distance_meters, ...rest }) => rest);
    return { items, total: merged.length };
  },

  async getInsightsSummary(params: { companyId: string }): Promise<InsightsSummary> {
    const cacheKey = `${SUMMARY_CACHE_PREFIX}${params.companyId}`;
    return withCache(cacheKey, INSIGHTS_LIST_TTL, () =>
      this.getInsightsSummaryFresh(params)
    );
  },

  async getInsightsSummaryFresh(params: { companyId: string }): Promise<InsightsSummary> {
    const [suggested, nearby, jobs] = await Promise.all([
      this.getSuggestedSeekers({ companyId: params.companyId, limit: 50 }),
      this.getNearbySeekers({ companyId: params.companyId, limit: 50 }),
      loadActiveJobsWithSkills(params.companyId),
    ]);

    const strongMatches = suggested.items.filter((s) => s.score >= 70).length;
    const insights: string[] = [];

    if (strongMatches > 0) {
      insights.push(
        `${strongMatches} strong candidate${strongMatches === 1 ? '' : 's'} match your active jobs but haven't applied yet.`
      );
    }
    if (nearby.total > 0) {
      insights.push(
        `${nearby.total} seeker${nearby.total === 1 ? '' : 's'} active near your branches in the last 90 days.`
      );
    }
    if (jobs.length > 0 && suggested.total > 0) {
      // Find the job with the most untapped matches (suggested but not applied)
      const perJob = new Map<string, { title: string; count: number }>();
      for (const s of suggested.items) {
        if (s.has_applied_already) continue;
        const existing = perJob.get(s.best_job.id);
        if (existing) existing.count += 1;
        else perJob.set(s.best_job.id, { title: s.best_job.title, count: 1 });
      }
      let topJob: { title: string; count: number } | null = null;
      for (const v of perJob.values()) {
        if (!topJob || v.count > topJob.count) topJob = v;
      }
      if (topJob && topJob.count >= 3) {
        insights.push(
          `"${topJob.title}" has ${topJob.count} untapped matches — consider reaching out.`
        );
      }
    }

    // Top growing skills among nearby seekers in the past 30 days. We use
    // recently updated seekers as a cheap proxy for "growing" — this is the
    // signal we have without an explicit skill-add timestamp on SeekerSkill.
    const recent = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const branchIds = await CompanyBranch.find({
      company_id: new mongoose.Types.ObjectId(params.companyId),
      is_active: true,
    })
      .select('_id')
      .lean();
    let topGrowing: { name: string; seeker_count: number }[] = [];
    if (branchIds.length > 0) {
      const recentSeekers = await SeekerProfile.find({
        updatedAt: { $gte: recent },
        visibility: { $in: ['public', 'companies_only'] },
      })
        .select('_id')
        .limit(500)
        .lean();
      if (recentSeekers.length > 0) {
        const seekerIds = recentSeekers.map((s) => s._id);
        const skills = await SeekerSkill.find({ seeker_id: { $in: seekerIds } })
          .select('skill_tag_id')
          .lean();
        const counts = new Map<string, number>();
        for (const s of skills) {
          const t = s.skill_tag_id.toString();
          counts.set(t, (counts.get(t) ?? 0) + 1);
        }
        const ranked = Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        if (ranked.length > 0) {
          const tagDocs = await SkillTag.find({
            _id: { $in: ranked.map(([id]) => new mongoose.Types.ObjectId(id)) },
          })
            .select('_id name')
            .lean();
          const nameById = new Map<string, string>(tagDocs.map((t) => [t._id.toString(), t.name]));
          topGrowing = ranked
            .map(([id, count]) => ({ name: nameById.get(id) ?? '', seeker_count: count }))
            .filter((r) => r.name);
        }
      }
    }

    if (topGrowing.length > 0) {
      insights.push(
        `Top skill among recently active seekers: ${topGrowing[0].name} (${topGrowing[0].seeker_count} seekers).`
      );
    }

    return {
      active_jobs: jobs.length,
      total_matches: suggested.total,
      strong_matches: strongMatches,
      nearby_seekers: nearby.total,
      insights,
      top_growing_skills: topGrowing,
    };
  },

  /**
   * One-shot LLM explanation for why a particular seeker matches a particular
   * job. Cached per (seeker, job) pair so repeat clicks are free.
   */
  async explainSeekerMatch(params: {
    companyId: string;
    seekerId: string;
    jobId: string;
  }): Promise<{ summary: string; cached: boolean }> {
    const cacheKey = `${EXPLAIN_CACHE_PREFIX}${params.jobId}:${params.seekerId}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return { summary: cached, cached: true };
    } catch {
      // redis miss — fall through
    }

    const [job, seeker] = await Promise.all([
      Job.findOne({
        _id: new mongoose.Types.ObjectId(params.jobId),
        company_id: new mongoose.Types.ObjectId(params.companyId),
      })
        .select('title description experience_min_years experience_max_years job_type work_mode')
        .lean(),
      SeekerProfile.findOne({
        _id: new mongoose.Types.ObjectId(params.seekerId),
        visibility: { $in: ['public', 'companies_only'] },
      })
        .select('first_name headline city preferred_work_mode preferred_job_types')
        .lean(),
    ]);
    if (!job) throw new Error('Job not found');
    if (!seeker) throw new Error('Seeker not found or not visible');

    const [jobSkills, seekerSkills] = await Promise.all([
      JobSkill.find({ job_id: job._id }).select('skill_tag_id is_required').lean(),
      SeekerSkill.find({ seeker_id: seeker._id }).select('skill_tag_id').lean(),
    ]);
    const allTagIds = Array.from(
      new Set([
        ...jobSkills.map((j) => j.skill_tag_id.toString()),
        ...seekerSkills.map((s) => s.skill_tag_id.toString()),
      ])
    );
    const tags = allTagIds.length
      ? await SkillTag.find({
          _id: { $in: allTagIds.map((id) => new mongoose.Types.ObjectId(id)) },
        })
          .select('_id name')
          .lean()
      : [];
    const nameById = new Map<string, string>(tags.map((t) => [t._id.toString(), t.name]));
    const requiredSkills = jobSkills
      .filter((j) => j.is_required)
      .map((j) => nameById.get(j.skill_tag_id.toString()))
      .filter((n): n is string => !!n);
    const seekerSkillNames = seekerSkills
      .map((s) => nameById.get(s.skill_tag_id.toString()))
      .filter((n): n is string => !!n);

    const experiences = await WorkExperience.find({ seeker_id: seeker._id })
      .select('job_title start_date end_date is_current')
      .lean();
    const totalYears = experiences.reduce(
      (sum, e) => sum + yearsBetween(e.start_date, e.is_current ? null : e.end_date),
      0
    );

    const payload = {
      job: {
        title: job.title,
        description: (job.description ?? '').slice(0, 600),
        required_skills: requiredSkills,
        experience_min_years: job.experience_min_years,
        experience_max_years: job.experience_max_years,
        job_type: job.job_type,
        work_mode: job.work_mode,
      },
      seeker: {
        headline: seeker.headline,
        city: seeker.city,
        skills: seekerSkillNames,
        total_experience_years: Number(totalYears.toFixed(1)),
        preferred_work_mode: seeker.preferred_work_mode,
        preferred_job_types: seeker.preferred_job_types,
        recent_titles: experiences
          .map((e) => e.job_title)
          .filter((t): t is string => !!t)
          .slice(0, 3),
      },
    };

    let summary = '';
    try {
      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are an HR assistant. In 2 sentences, explain why a seeker is or is not a strong match for a specific job. Be concrete, cite specific skills/experience, and call out gaps honestly. Return strict JSON: {"summary": "..."}',
          },
          {
            role: 'user',
            content: JSON.stringify(payload),
          },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw) as { summary?: string };
      summary = typeof parsed.summary === 'string' ? parsed.summary.slice(0, 500) : '';
    } catch (err) {
      console.error('[insights] explainSeekerMatch failed:', err);
      throw new Error('Failed to generate match explanation');
    }

    if (!summary) throw new Error('Empty explanation from LLM');

    try {
      await redis.setex(cacheKey, EXPLAIN_TTL, summary);
    } catch {
      // best effort
    }
    return { summary, cached: false };
  },

  /**
   * Send a personal "you'd be a great fit" invite to a matched seeker, with
   * a deep link to the public job page so they can apply directly. Also pushes
   * an in-app notification so the seeker sees it when they log in.
   *
   * Throttled per (company, seeker, job) tuple — companies can invite the
   * same seeker again, but not spam them within INVITE_COOLDOWN_SEC.
   */
  async inviteSeekerToApply(params: {
    companyId: string;
    inviterUserId: string;
    seekerId: string;
    jobId: string;
    message?: string;
  }): Promise<{ sent: true; alreadyInvitedRecently?: boolean }> {
    const INVITE_COOLDOWN_SEC = 60 * 60 * 24 * 7; // one week
    const cooldownKey = `company:insights:invite:${params.companyId}:${params.jobId}:${params.seekerId}`;
    try {
      const recent = await redis.get(cooldownKey);
      if (recent) {
        throw new Error('You already invited this seeker for this role recently. Try again in a few days.');
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('You already invited')) throw err;
      // redis miss / down — proceed without cooldown
    }

    const seeker = await SeekerProfile.findById(params.seekerId)
      .select('user_id first_name last_name visibility')
      .lean();
    if (!seeker) throw new Error('Seeker not found');
    if (seeker.visibility === 'hidden') {
      throw new Error('This seeker has hidden their profile and cannot be contacted.');
    }
    if (!seeker.user_id) throw new Error('Seeker has no linked user account');

    const [user, job, company, inviter, existingApp] = await Promise.all([
      User.findById(seeker.user_id).select('email').lean(),
      Job.findOne({
        _id: new mongoose.Types.ObjectId(params.jobId),
        company_id: new mongoose.Types.ObjectId(params.companyId),
      })
        .select('title status')
        .lean(),
      Company.findById(params.companyId).select('name').lean(),
      User.findById(params.inviterUserId).select('email first_name last_name').lean(),
      Application.findOne({
        seeker_id: new mongoose.Types.ObjectId(params.seekerId),
        job_id: new mongoose.Types.ObjectId(params.jobId),
      })
        .select('_id')
        .lean(),
    ]);

    if (!user?.email) throw new Error('Seeker does not have an email on file');
    if (!job) throw new Error('Job not found for this company');
    if (job.status !== 'active') throw new Error('Job is not active — re-open it before inviting candidates.');
    if (!company) throw new Error('Company not found');
    if (existingApp) {
      throw new Error('This seeker has already applied to this job.');
    }

    const inviterName = inviter
      ? [inviter.first_name, inviter.last_name].filter(Boolean).join(' ') || undefined
      : undefined;
    const candidateName =
      [seeker.first_name, seeker.last_name].filter(Boolean).join(' ') || undefined;

    // Persist the invite first so the tracking pixel/click endpoints have
    // a row to update — even if the SMTP send is slow or the email never
    // actually delivers, we still have a record of the attempt.
    const token = crypto.randomBytes(24).toString('hex');
    const inviteDoc = await JobInvite.create({
      company_id: new mongoose.Types.ObjectId(params.companyId),
      inviter_user_id: new mongoose.Types.ObjectId(params.inviterUserId),
      seeker_id: seeker._id,
      seeker_user_id: seeker.user_id,
      job_id: job._id,
      job_title_snapshot: job.title,
      seeker_email_snapshot: user.email,
      inviter_email_snapshot: inviter?.email,
      message: params.message,
      token,
      status: 'sent' as JobInviteStatus,
      sent_at: new Date(),
    });

    const trackingBase = `${config.CORS_ORIGINS.replace(/\/+$/, '')}/api/v1/track/invite/${token}`;
    const clickUrl = `${trackingBase}/click`;
    const openPixelUrl = `${trackingBase}/open.gif`;

    try {
      await emailService.sendCandidateMatchInviteEmail({
        to: user.email,
        candidateName,
        jobId: job._id.toString(),
        jobTitle: job.title,
        companyName: company.name,
        inviterEmail: inviter?.email,
        inviterName,
        personalMessage: params.message,
        clickUrl,
        openPixelUrl,
      });
    } catch (err) {
      // Email failed — keep the JobInvite row so the company can see the
      // attempt and retry; just log here. (The shared email service already
      // catches and logs SMTP errors, so this catch is defensive.)
      console.error('[insights.inviteSeekerToApply] email send threw:', err);
      void inviteDoc; // keep the invite row regardless
    }

    // Best-effort in-app notification — failure here shouldn't fail the invite.
    void (async () => {
      try {
        await notificationService.notify(
          seeker.user_id!.toString(),
          'job.invite',
          `${company.name} thinks you're a great fit`,
          `Apply for ${job.title}`,
          `/seeker/jobs/${job._id.toString()}`
        );
      } catch (err) {
        console.error('[insights.inviteSeekerToApply] notification push failed:', err);
      }
    })();

    try {
      await redis.setex(cooldownKey, INVITE_COOLDOWN_SEC, '1');
    } catch {
      // best effort
    }

    return { sent: true };
  },

  /**
   * Paginated listing of invites a company has sent, newest first. Optional
   * status filter (sent / opened / clicked / applied) and optional jobId.
   */
  async listInvites(params: {
    companyId: string;
    status?: JobInviteStatus;
    jobId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: Array<{
      id: string;
      job: { id: string; title: string };
      seeker: {
        id: string;
        first_name?: string;
        last_name?: string;
        email: string;
        avatar_url?: string;
      };
      inviter_email?: string;
      message?: string;
      status: JobInviteStatus;
      sent_at: Date;
      opened_at?: Date;
      clicked_at?: Date;
      applied_at?: Date;
      open_count: number;
      click_count: number;
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
    };
    summary: {
      total: number;
      sent: number;
      opened: number;
      clicked: number;
      applied: number;
    };
  }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      company_id: new mongoose.Types.ObjectId(params.companyId),
    };
    if (params.status) filter.status = params.status;
    if (params.jobId) filter.job_id = new mongoose.Types.ObjectId(params.jobId);

    const [rawItems, total, statusCounts] = await Promise.all([
      JobInvite.find(filter)
        .sort({ sent_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      JobInvite.countDocuments(filter),
      JobInvite.aggregate<{ _id: JobInviteStatus; count: number }>([
        { $match: { company_id: new mongoose.Types.ObjectId(params.companyId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    // Hydrate seeker profile bits (name + avatar) for the page slice only.
    const seekerIds = Array.from(
      new Set(rawItems.map((i) => i.seeker_id.toString()))
    ).map((id) => new mongoose.Types.ObjectId(id));
    const seekers = seekerIds.length
      ? await SeekerProfile.find({ _id: { $in: seekerIds } })
          .select('_id first_name last_name avatar_url')
          .lean()
      : [];
    const seekerById = new Map(seekers.map((s) => [s._id.toString(), s]));

    const items = rawItems.map((i) => {
      const sk = seekerById.get(i.seeker_id.toString());
      return {
        id: i._id.toString(),
        job: {
          id: i.job_id.toString(),
          title: i.job_title_snapshot,
        },
        seeker: {
          id: i.seeker_id.toString(),
          first_name: sk?.first_name,
          last_name: sk?.last_name,
          email: i.seeker_email_snapshot,
          avatar_url: sk?.avatar_url,
        },
        inviter_email: i.inviter_email_snapshot,
        message: i.message,
        status: i.status,
        sent_at: i.sent_at,
        opened_at: i.opened_at,
        clicked_at: i.clicked_at,
        applied_at: i.applied_at,
        open_count: i.open_count ?? 0,
        click_count: i.click_count ?? 0,
      };
    });

    const summaryBuckets: Record<JobInviteStatus, number> = {
      sent: 0,
      opened: 0,
      clicked: 0,
      applied: 0,
    };
    for (const row of statusCounts) summaryBuckets[row._id] = row.count;
    const summary = {
      total: summaryBuckets.sent + summaryBuckets.opened + summaryBuckets.clicked + summaryBuckets.applied,
      sent: summaryBuckets.sent,
      opened: summaryBuckets.opened,
      clicked: summaryBuckets.clicked,
      applied: summaryBuckets.applied,
    };

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNext: page * limit < total,
      },
      summary,
    };
  },

  /**
   * Compact "latest invite per (job, seeker) tuple" lookup for the AI
   * Insights inline badge. Returns up to one row per pair the caller asks
   * about. Used by the frontend to overlay invite status on Suggested Seekers.
   */
  async getLatestInvitesFor(params: {
    companyId: string;
    pairs: Array<{ seekerId: string; jobId: string }>;
  }): Promise<Array<{
    seeker_id: string;
    job_id: string;
    status: JobInviteStatus;
    sent_at: Date;
    opened_at?: Date;
    clicked_at?: Date;
    applied_at?: Date;
  }>> {
    if (params.pairs.length === 0) return [];
    const orClauses = params.pairs
      .filter((p) => mongoose.isValidObjectId(p.seekerId) && mongoose.isValidObjectId(p.jobId))
      .map((p) => ({
        seeker_id: new mongoose.Types.ObjectId(p.seekerId),
        job_id: new mongoose.Types.ObjectId(p.jobId),
      }));
    if (orClauses.length === 0) return [];

    const rows = await JobInvite.aggregate<{
      _id: { seeker_id: mongoose.Types.ObjectId; job_id: mongoose.Types.ObjectId };
      status: JobInviteStatus;
      sent_at: Date;
      opened_at?: Date;
      clicked_at?: Date;
      applied_at?: Date;
    }>([
      {
        $match: {
          company_id: new mongoose.Types.ObjectId(params.companyId),
          $or: orClauses,
        },
      },
      { $sort: { sent_at: -1 } },
      {
        $group: {
          _id: { seeker_id: '$seeker_id', job_id: '$job_id' },
          status: { $first: '$status' },
          sent_at: { $first: '$sent_at' },
          opened_at: { $first: '$opened_at' },
          clicked_at: { $first: '$clicked_at' },
          applied_at: { $first: '$applied_at' },
        },
      },
    ]);

    return rows.map((r) => ({
      seeker_id: r._id.seeker_id.toString(),
      job_id: r._id.job_id.toString(),
      status: r.status,
      sent_at: r.sent_at,
      opened_at: r.opened_at,
      clicked_at: r.clicked_at,
      applied_at: r.applied_at,
    }));
  },

  /**
   * Called from the application-create paths whenever a seeker submits an
   * application. Marks any pending invite for the same (seeker, job) tuple
   * as "applied" and links the resulting Application id. Fire-and-forget —
   * never throws; logs instead, since application creation should not be
   * blocked by tracking-system hiccups.
   */
  /**
   * Wipe the cached insights listings for a company. Call this after any
   * mutation that would change the result set: new/updated/deleted job,
   * branch added/removed, etc. Cheap (a couple of SCAN sweeps) and bounded
   * by the small number of param combinations we cache per company.
   */
  async invalidateCompanyCache(companyId: string): Promise<void> {
    await Promise.all([
      bustCachePattern(`${SUGGEST_CACHE_PREFIX}${companyId}:*`),
      bustCachePattern(`${NEARBY_CACHE_PREFIX}${companyId}:*`),
      bustCachePattern(`${SUMMARY_CACHE_PREFIX}${companyId}*`),
    ]);
  },

  async markAppliedFromApplication(params: {
    seekerId: string;
    jobId: string;
    applicationId: string;
  }): Promise<void> {
    try {
      await JobInvite.updateMany(
        {
          seeker_id: new mongoose.Types.ObjectId(params.seekerId),
          job_id: new mongoose.Types.ObjectId(params.jobId),
          status: { $ne: 'applied' },
        },
        {
          $set: {
            status: 'applied',
            applied_at: new Date(),
            application_id: new mongoose.Types.ObjectId(params.applicationId),
          },
        }
      );
    } catch (err) {
      console.error('[insights.markAppliedFromApplication] failed:', err);
    }
  },
};

export default insightsService;
