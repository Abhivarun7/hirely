import { getOpenAI, OPENAI_MODEL } from '../../config/openai.js';

export interface LlmRankSeeker {
  skill_names: string[];
  headline?: string;
  recent_titles?: string[];
  total_experience_years?: number;
  city?: string;
  preferred_work_mode?: 'onsite' | 'remote' | 'hybrid';
  preferred_job_types?: string[];
  expected_salary_min?: number;
  expected_salary_max?: number;
  expected_salary_currency?: string;
  applied_company_ids?: string[];
  applied_skill_names?: string[];
}

export interface LlmRankJob {
  _id: string;
  title: string;
  description?: string;
  experience_level?: string;
  experience_min_years?: number;
  experience_max_years?: number;
  job_type?: string;
  work_mode?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  primary_city?: string;
  distance_km?: number;
  posted_days_ago?: number;
  required_skill_names: string[];
  optional_skill_names: string[];
  company_id?: string;
}

export interface LlmRankResult {
  job_id: string;
  score: number;
  reason: string;
}

const MAX_JOBS_PER_CALL = 30;
const DESCRIPTION_CHAR_BUDGET = 600;

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

function compactSeeker(s: LlmRankSeeker): Record<string, unknown> {
  return {
    headline: s.headline,
    recent_titles: s.recent_titles,
    skills: s.skill_names,
    total_experience_years: s.total_experience_years,
    city: s.city,
    preferred_work_mode: s.preferred_work_mode,
    preferred_job_types: s.preferred_job_types,
    expected_salary_min: s.expected_salary_min,
    expected_salary_max: s.expected_salary_max,
    expected_salary_currency: s.expected_salary_currency,
    previously_applied_company_ids: s.applied_company_ids,
    previously_applied_skills: s.applied_skill_names,
  };
}

function compactJob(j: LlmRankJob): Record<string, unknown> {
  return {
    job_id: j._id,
    title: j.title,
    description: j.description ? j.description.slice(0, DESCRIPTION_CHAR_BUDGET) : undefined,
    experience_level: j.experience_level,
    experience_min_years: j.experience_min_years,
    experience_max_years: j.experience_max_years,
    job_type: j.job_type,
    work_mode: j.work_mode,
    salary_min: j.salary_min,
    salary_max: j.salary_max,
    salary_currency: j.salary_currency,
    city: j.primary_city,
    distance_km: j.distance_km,
    posted_days_ago: j.posted_days_ago,
    required_skills: j.required_skill_names,
    optional_skills: j.optional_skill_names,
    company_id: j.company_id,
  };
}

export async function rankJobsForSeeker(
  seeker: LlmRankSeeker,
  jobs: LlmRankJob[],
  limit: number
): Promise<LlmRankResult[] | null> {
  if (jobs.length === 0) return [];

  const trimmedJobs = jobs.slice(0, MAX_JOBS_PER_CALL);
  const compactJobs = trimmedJobs.map(compactJob);
  const payload = {
    seeker: compactSeeker(seeker),
    jobs: compactJobs,
  };

  let raw: string;
  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You rank job postings for a single job seeker on a job board. Score each posting 0-100 by how well it fits this seeker, weighing skill match (especially required skills), title/role relevance, experience level, work mode and job type preferences, salary fit, geo proximity, and recency. Reward semantic role overlap (e.g. "platform engineer" ↔ "backend engineer with infra focus"), not just literal matches. Be honest about poor fits. Return strict JSON only.',
        },
        {
          role: 'user',
          content: `Seeker and candidate jobs (already pre-filtered by skill overlap and proximity):
${JSON.stringify(payload, null, 2)}

Score every job. Respond with JSON in this exact shape:
{
  "rankings": [
    {
      "job_id": "<job_id from input>",
      "score": <0-100>,
      "reason": "<one short sentence on why this fits or does not>"
    }
  ]
}
Include every job_id from the input. Order by score descending. Return at most ${Math.max(limit, trimmedJobs.length)} entries.`,
        },
      ],
    });
    raw = completion.choices[0]?.message?.content ?? '{}';
  } catch (err) {
    console.error('[llm-recommendation] OpenAI call failed:', err);
    return null;
  }

  const parsed = safeJsonParse<{ rankings: { job_id: string; score: number; reason: string }[] }>(raw);
  if (!parsed || !Array.isArray(parsed.rankings)) {
    console.error('[llm-recommendation] Failed to parse OpenAI response');
    return null;
  }

  const validIds = new Set(trimmedJobs.map((j) => j._id));
  const cleaned: LlmRankResult[] = [];
  for (const r of parsed.rankings) {
    if (!r || typeof r.job_id !== 'string' || !validIds.has(r.job_id)) continue;
    const score = Math.max(0, Math.min(100, Math.round(Number(r.score) || 0)));
    const reason = typeof r.reason === 'string' ? r.reason.slice(0, 280) : '';
    cleaned.push({ job_id: r.job_id, score, reason });
  }
  return cleaned;
}
