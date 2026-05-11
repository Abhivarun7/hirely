import {
  User,
  SeekerProfile,
  SeekerSkill,
  WorkExperience,
  Education,
  Job,
  JobSkill,
  Application,
  SkillTag,
} from '../../models/index.js';
import { getOpenAI, OPENAI_MODEL } from '../../config/openai.js';

interface CandidateSuggestion {
  user_id: string;
  seeker_id: string;
  name: string;
  email: string;
  headline?: string;
  match_score: number;
  reason: string;
  strengths: string[];
  gaps: string[];
}

interface SeekerInsights {
  user_id: string;
  best_fit_roles: { title: string; reason: string; confidence: number }[];
  current_strengths: string[];
  things_to_improve: { area: string; why: string; how: string }[];
  applied_targets_summary: string;
  overall_assessment: string;
}

async function buildSeekerSnapshot(seekerProfileId: string): Promise<{
  profile: any;
  user: any;
  skills: { name: string; proficiency: string }[];
  experience: { title?: string; company?: string; from?: Date; to?: Date; description?: string }[];
  education: { degree?: string; field?: string; institution?: string }[];
  applications: {
    job_title: string;
    company?: string;
    status: string;
    required_skills: string[];
    experience_level?: string;
    job_category?: string;
  }[];
}> {
  const profile = await SeekerProfile.findById(seekerProfileId).lean();
  if (!profile) throw new Error('Seeker profile not found');

  const user = await User.findById(profile.user_id).select('email role createdAt').lean();

  const seekerSkills = await SeekerSkill.find({ seeker_id: seekerProfileId })
    .populate('skill_tag_id', 'name')
    .lean();

  const skills = seekerSkills.map((s: any) => ({
    name: s.skill_tag_id?.name ?? 'unknown',
    proficiency: s.proficiency,
  }));

  const experience = await WorkExperience.find({ seeker_id: seekerProfileId })
    .sort({ start_date: -1 })
    .lean();

  const education = await Education.find({ seeker_id: seekerProfileId })
    .sort({ end_date: -1 })
    .lean();

  const apps = await Application.find({ seeker_id: seekerProfileId })
    .populate({
      path: 'job_id',
      select: 'title experience_level company_id category_id',
      populate: [
        { path: 'company_id', select: 'name' },
        { path: 'category_id', select: 'name' },
      ],
    })
    .sort({ applied_at: -1 })
    .limit(20)
    .lean();

  const applications = await Promise.all(
    apps.map(async (a: any) => {
      const jobSkills = a.job_id
        ? await JobSkill.find({ job_id: a.job_id._id })
            .populate('skill_tag_id', 'name')
            .lean()
        : [];
      return {
        job_title: a.job_id?.title ?? 'unknown',
        company: a.job_id?.company_id?.name,
        status: a.status,
        experience_level: a.job_id?.experience_level,
        job_category: a.job_id?.category_id?.name,
        required_skills: jobSkills.map((js: any) => js.skill_tag_id?.name).filter(Boolean),
      };
    })
  );

  return {
    profile,
    user,
    skills,
    experience: experience.map((e: any) => ({
      title: e.job_title,
      company: e.company_name,
      from: e.start_date,
      to: e.end_date,
      description: e.description,
    })),
    education: education.map((e: any) => ({
      degree: e.degree,
      field: e.field_of_study,
      institution: e.institution,
    })),
    applications,
  };
}

async function buildJobSnapshot(jobId: string): Promise<{
  job: any;
  required_skills: string[];
  optional_skills: string[];
  category?: string;
  company?: string;
}> {
  const job: any = await Job.findById(jobId)
    .populate('company_id', 'name')
    .populate('category_id', 'name')
    .lean();
  if (!job) throw new Error('Job not found');

  const jobSkills = await JobSkill.find({ job_id: jobId })
    .populate('skill_tag_id', 'name')
    .lean();

  const required_skills: string[] = [];
  const optional_skills: string[] = [];
  for (const js of jobSkills as any[]) {
    const name = js.skill_tag_id?.name;
    if (!name) continue;
    if (js.is_required) required_skills.push(name);
    else optional_skills.push(name);
  }

  return {
    job,
    required_skills,
    optional_skills,
    category: job.category_id?.name,
    company: job.company_id?.name,
  };
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export class AdminAIService {
  /**
   * Find candidate seekers for a given job and rank them with OpenAI.
   * Pre-filters with skill overlap to keep the prompt small.
   */
  async suggestCandidatesForJob(jobId: string, limit = 10): Promise<CandidateSuggestion[]> {
    const jobSnap = await buildJobSnapshot(jobId);
    const jobSkillNames = [...jobSnap.required_skills, ...jobSnap.optional_skills];

    const matchingSkillTags = await SkillTag.find({
      name: { $in: jobSkillNames.length ? jobSkillNames : [''] },
    })
      .select('_id')
      .lean();
    const matchingTagIds = matchingSkillTags.map((t) => t._id);

    let seekerIds: string[] = [];
    if (matchingTagIds.length) {
      const seekerSkills = await SeekerSkill.find({ skill_tag_id: { $in: matchingTagIds } })
        .select('seeker_id')
        .lean();
      seekerIds = [...new Set(seekerSkills.map((s) => s.seeker_id.toString()))];
    }

    if (seekerIds.length === 0) {
      const fallback = await SeekerProfile.find({})
        .sort({ profile_complete_pct: -1, updatedAt: -1 })
        .limit(50)
        .select('_id')
        .lean();
      seekerIds = fallback.map((s) => s._id.toString());
    }

    const candidatePool = seekerIds.slice(0, 30);
    const snapshots = await Promise.all(
      candidatePool.map(async (id) => {
        try {
          return await buildSeekerSnapshot(id);
        } catch {
          return null;
        }
      })
    );

    const validSnaps = snapshots.filter(Boolean) as Awaited<ReturnType<typeof buildSeekerSnapshot>>[];
    if (validSnaps.length === 0) return [];

    const compactCandidates = validSnaps.map((s) => ({
      user_id: s.profile.user_id?.toString(),
      seeker_id: s.profile._id.toString(),
      name: [s.profile.first_name, s.profile.last_name].filter(Boolean).join(' ') || s.user?.email,
      email: s.user?.email,
      headline: s.profile.headline,
      city: s.profile.city,
      country: s.profile.country,
      skills: s.skills.map((sk) => `${sk.name} (${sk.proficiency})`),
      latest_role: s.experience[0]?.title,
      total_experience: s.experience.length,
      degree: s.education[0]?.degree,
      field_of_study: s.education[0]?.field,
    }));

    const compactJob = {
      title: jobSnap.job.title,
      company: jobSnap.company,
      category: jobSnap.category,
      experience_level: jobSnap.job.experience_level,
      experience_min_years: jobSnap.job.experience_min_years,
      experience_max_years: jobSnap.job.experience_max_years,
      job_type: jobSnap.job.job_type,
      work_mode: jobSnap.job.work_mode,
      required_skills: jobSnap.required_skills,
      optional_skills: jobSnap.optional_skills,
      description: (jobSnap.job.description || '').slice(0, 1500),
      requirements: (jobSnap.job.requirements || '').slice(0, 1500),
    };

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a recruiting assistant for a job board admin. Score candidate seekers against a job opening. Be honest about gaps. Return strict JSON only.',
        },
        {
          role: 'user',
          content: `Job:
${JSON.stringify(compactJob, null, 2)}

Candidates (pre-filtered by overlapping skills):
${JSON.stringify(compactCandidates, null, 2)}

Score each candidate 0-100 for fit to this job. Consider skill overlap (especially required skills), experience level, and role relevance. Respond with JSON in this exact shape:
{
  "suggestions": [
    {
      "seeker_id": "<id from input>",
      "user_id": "<id from input>",
      "match_score": <0-100>,
      "reason": "<one sentence on why they fit>",
      "strengths": ["<short bullet>", "..."],
      "gaps": ["<short bullet>", "..."]
    }
  ]
}
Return at most ${limit} candidates, ordered by match_score descending. Skip candidates with score < 30.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = safeJsonParse<{ suggestions: any[] }>(raw);
    const suggestions = parsed?.suggestions ?? [];

    const byId = new Map(compactCandidates.map((c) => [c.seeker_id, c]));
    return suggestions
      .map((s) => {
        const c = byId.get(s.seeker_id);
        if (!c) return null;
        return {
          user_id: c.user_id || s.user_id,
          seeker_id: c.seeker_id,
          name: c.name,
          email: c.email,
          headline: c.headline,
          match_score: Number(s.match_score) || 0,
          reason: String(s.reason || ''),
          strengths: Array.isArray(s.strengths) ? s.strengths.map(String) : [],
          gaps: Array.isArray(s.gaps) ? s.gaps.map(String) : [],
        } as CandidateSuggestion;
      })
      .filter(Boolean) as CandidateSuggestion[];
  }

  /**
   * Career insights for a seeker: what roles they fit best, what they should improve.
   */
  async getSeekerInsights(userId: string): Promise<SeekerInsights> {
    const user = await User.findById(userId).lean();
    if (!user) throw new Error('User not found');
    if (!user.seeker_profile_id) throw new Error('User does not have a seeker profile');

    const snapshot = await buildSeekerSnapshot(user.seeker_profile_id.toString());

    const compact = {
      user_id: userId,
      profile: {
        name: [snapshot.profile.first_name, snapshot.profile.last_name].filter(Boolean).join(' ') || user.email,
        headline: snapshot.profile.headline,
        bio: (snapshot.profile.bio || '').slice(0, 800),
        city: snapshot.profile.city,
        country: snapshot.profile.country,
        profile_complete_pct: snapshot.profile.profile_complete_pct,
      },
      skills: snapshot.skills,
      experience: snapshot.experience.map((e) => ({
        title: e.title,
        company: e.company,
        from: e.from,
        to: e.to,
        description: (e.description || '').slice(0, 400),
      })),
      education: snapshot.education,
      applications: snapshot.applications,
    };

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a career advisor inside an admin tool. You analyze a job seeker profile and the jobs they apply to, then tell the admin what the seeker is best fit for and what they should improve. Be specific, kind, and actionable. Return strict JSON only.',
        },
        {
          role: 'user',
          content: `Seeker data:
${JSON.stringify(compact, null, 2)}

Return JSON in this exact shape:
{
  "best_fit_roles": [
    { "title": "<role>", "reason": "<why this seeker fits it>", "confidence": <0-100> }
  ],
  "current_strengths": ["<strength>", "..."],
  "things_to_improve": [
    { "area": "<skill/topic>", "why": "<why it matters for their target>", "how": "<concrete next step>" }
  ],
  "applied_targets_summary": "<one sentence on what kinds of roles they apply to>",
  "overall_assessment": "<2-3 sentences for the admin>"
}

Use the applications list to figure out what they are *trying* to be (target roles). Then evaluate readiness. Suggest 3-5 best_fit_roles, 3-6 strengths, and 3-6 things_to_improve.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = safeJsonParse<Omit<SeekerInsights, 'user_id'>>(raw);

    return {
      user_id: userId,
      best_fit_roles: parsed?.best_fit_roles ?? [],
      current_strengths: parsed?.current_strengths ?? [],
      things_to_improve: parsed?.things_to_improve ?? [],
      applied_targets_summary: parsed?.applied_targets_summary ?? '',
      overall_assessment: parsed?.overall_assessment ?? '',
    };
  }

  /**
   * Lightweight directory: every seeker with a few quick stats. Useful so the
   * admin Users screen can show seeker-specific info without N round trips.
   */
  async getSeekerDirectory(page = 1, limit = 20, search?: string): Promise<{
    seekers: any[];
    pagination: any;
  }> {
    const skip = (page - 1) * limit;

    const userQuery: Record<string, unknown> = { role: 'job_seeker' };
    if (search) {
      userQuery.email = { $regex: search, $options: 'i' };
    }

    const [users, total] = await Promise.all([
      User.find(userQuery)
        .select('email seeker_profile_id is_active is_banned createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(userQuery),
    ]);

    const seekerIds = users.map((u) => u.seeker_profile_id).filter(Boolean);
    const profiles = await SeekerProfile.find({ _id: { $in: seekerIds } }).lean();
    const profileMap = new Map(profiles.map((p) => [p._id.toString(), p]));

    const appCounts = await Application.aggregate([
      { $match: { seeker_id: { $in: seekerIds } } },
      { $group: { _id: '$seeker_id', count: { $sum: 1 } } },
    ]);
    const appMap = new Map(appCounts.map((a: any) => [a._id.toString(), a.count]));

    // Latest work experience per seeker — used to surface the current company
    // in the directory list. We sort by is_current first, then start_date desc
    // so a seeker who marked a job current always wins, and otherwise we fall
    // back to the most recent role.
    const experiences = await WorkExperience.find({ seeker_id: { $in: seekerIds } })
      .sort({ is_current: -1, start_date: -1 })
      .lean();
    const expMap = new Map<string, any>();
    for (const e of experiences) {
      const key = e.seeker_id.toString();
      if (!expMap.has(key)) expMap.set(key, e);
    }

    const seekers = users.map((u) => {
      const p: any = u.seeker_profile_id ? profileMap.get(u.seeker_profile_id.toString()) : null;
      const latest = p ? expMap.get(p._id.toString()) : null;
      return {
        user_id: u._id.toString(),
        email: u.email,
        is_active: u.is_active,
        is_banned: u.is_banned,
        joined_at: u.createdAt,
        seeker_id: p?._id?.toString(),
        name: p ? [p.first_name, p.last_name].filter(Boolean).join(' ') : null,
        headline: p?.headline,
        city: p?.city,
        country: p?.country,
        profile_complete_pct: p?.profile_complete_pct ?? 0,
        applications_count: u.seeker_profile_id ? appMap.get(u.seeker_profile_id.toString()) ?? 0 : 0,
        current_company: latest?.company_name ?? null,
        current_role: latest?.job_title ?? null,
        is_current_job: !!latest?.is_current,
      };
    });

    return {
      seekers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }
}

export const adminAIService = new AdminAIService();
export default adminAIService;
