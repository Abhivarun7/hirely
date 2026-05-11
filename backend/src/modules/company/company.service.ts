import mongoose from 'mongoose';
import {
  Company,
  CompanyBranch,
  Job,
  JobSkill,
  Application,
  ApplicationNote,
  ApplicationStatusHistory,
  Interview,
  User,
  AuditLog,
  SeekerProfile,
  Resume,
  SkillTag,
  Education,
  WorkExperience,
  SeekerSkill,
  EmploymentOfficialProfile,
  JobView,
} from '../../models/index.js';
import { JobStatus, ApplicationStatus } from '../../types/index.js';
import { Queue } from 'bullmq';
import { redis } from '../../config/redis.js';
import { generateInviteToken } from '../auth/auth.service.js';
import { emailService } from '../shared/email.service.js';
import OpenAI from 'openai';
import { config } from '../../config/env.js';
import { withCache, hashKey } from '../../lib/cache.js';
import { insightsService } from './insights.service.js';

const openai = config.OPENAI_API_KEY ? new OpenAI({ apiKey: config.OPENAI_API_KEY }) : null;

const eventQueue = new Queue('events', { connection: redis });

/**
 * Recursively sanitize all string values in an object to ensure valid UTF-8.
 * Strips out any characters that would cause BSON encoding issues.
 */
function sanitizeUtf8(value: unknown): unknown {
  if (typeof value === 'string') {
    // Remove surrogate pairs and other invalid UTF-8 sequences
    // eslint-disable-next-line no-control-regex
    return value.replace(/[\uD800-\uDFFF]/g, '').replace(/\uFFFD/g, '');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeUtf8);
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      sanitized[k] = sanitizeUtf8(v);
    }
    return sanitized;
  }
  return value;
}

export interface BranchData {
  name: string;
  city: string;
  state?: string;
  country: string;
  address: string;
  phone?: string;
  email?: string;
  latitude: number;
  longitude: number;
  google_place_id?: string;
  is_active?: boolean;
}

export interface JobData {
  category_id?: string;
  title: string;
  description: string;
  responsibilities?: string;
  requirements?: string;
  experience_level?: string;
  experience_min_years?: number;
  experience_max_years?: number;
  job_type: string;
  work_mode: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_disclosed?: boolean;
  application_deadline?: string;
  locations: Array<{
    branch_id?: string;
    label: string;
    latitude: number;
    longitude: number;
    city: string;
    state?: string;
    country: string;
    address?: string;
    google_place_id?: string;
    openings?: number;
    is_primary?: boolean;
  }>;
  skills?: Array<{ skill_tag_id: string; is_required?: boolean }>;
}

export class CompanyService {
  // ============ Profile ============

  async getProfile(companyId: string): Promise<unknown> {
    return Company.findById(companyId).lean();
  }

  async updateProfile(
    companyId: string,
    data: Record<string, unknown>,
    actor?: { userId: string; role: string }
  ): Promise<unknown> {
    const before = actor ? await Company.findById(companyId).lean() : null;
    const updated = await Company.findByIdAndUpdate(
      companyId,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    if (actor && updated) {
      await this.createAuditLog(
        actor.userId,
        actor.role,
        'company.profile_updated',
        'Company',
        companyId,
        before,
        updated
      );
    }

    return updated;
  }

  async updateLogo(
    companyId: string,
    logoUrl: string,
    actor?: { userId: string; role: string }
  ): Promise<unknown> {
    const before = actor ? await Company.findById(companyId).select('logo_url').lean() : null;
    const updated = await Company.findByIdAndUpdate(
      companyId,
      { $set: { logo_url: logoUrl } },
      { new: true }
    ).lean();

    if (actor && updated) {
      await this.createAuditLog(
        actor.userId,
        actor.role,
        'company.logo_updated',
        'Company',
        companyId,
        before,
        { logo_url: logoUrl }
      );
    }

    return updated;
  }

  // ============ Branches ============

  async getBranches(companyId: string): Promise<unknown[]> {
    return CompanyBranch.find({ company_id: companyId }).sort({ createdAt: -1 }).lean();
  }

  async getBranchById(companyId: string, branchId: string): Promise<unknown> {
    return CompanyBranch.findOne({ _id: branchId, company_id: companyId }).lean();
  }

  async createBranch(companyId: string, data: BranchData, userId: string): Promise<unknown> {
    const branch = await CompanyBranch.create({
      company_id: companyId,
      ...data,
      // Set GeoJSON explicitly — pre-validate hook is unreliable with create()
      location: { type: 'Point', coordinates: [data.longitude, data.latitude] },
    });

    await this.createAuditLog(
      userId,
      'company_owner',
      'branch.created',
      'CompanyBranch',
      branch._id.toString(),
      undefined,
      branch.toObject()
    );

    void insightsService.invalidateCompanyCache(companyId);

    return branch;
  }

  async updateBranch(
    companyId: string,
    branchId: string,
    data: Partial<BranchData>,
    userId: string
  ): Promise<unknown> {
    const oldBranch = await CompanyBranch.findOne({ _id: branchId, company_id: companyId });

    // findOneAndUpdate skips hooks, so compute GeoJSON coordinates explicitly
    const updateData: Record<string, unknown> = { ...data };
    if (data.latitude != null && data.longitude != null) {
      updateData.location = { type: 'Point', coordinates: [data.longitude, data.latitude] };
    }

    const branch = await CompanyBranch.findOneAndUpdate(
      { _id: branchId, company_id: companyId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (branch && oldBranch) {
      await this.createAuditLog(
        userId,
        'company_owner',
        'branch.updated',
        'CompanyBranch',
        branchId,
        oldBranch.toObject(),
        branch
      );
    }

    void insightsService.invalidateCompanyCache(companyId);

    return branch;
  }

  async deleteBranch(companyId: string, branchId: string, userId: string): Promise<boolean> {
    const branch = await CompanyBranch.findOne({ _id: branchId, company_id: companyId });

    if (!branch) return false;

    // Check if branch has active jobs
    const activeJobs = await Job.countDocuments({
      company_id: companyId,
      'locations.branch_id': branchId,
      status: { $in: ['active', 'draft'] },
    });

    if (activeJobs > 0) {
      throw new Error('Cannot delete branch with active or draft jobs');
    }

    await CompanyBranch.deleteOne({ _id: branchId, company_id: companyId });

    await this.createAuditLog(
      userId,
      'company_owner',
      'branch.deleted',
      'CompanyBranch',
      branchId,
      branch.toObject(),
      undefined
    );

    void insightsService.invalidateCompanyCache(companyId);

    return true;
  }

  // ============ Team ============

  async getTeam(companyId: string): Promise<unknown[]> {
    return User.find({ company_id: companyId })
      .select('-password_hash -totp_secret')
      .populate('branch_id', 'name city')
      .lean();
  }

  async inviteTeamMember(
    companyId: string,
    email: string,
    role: string,
    inviterName: string,
    companyName: string,
    branchId?: string
  ): Promise<unknown> {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      if (existingUser.company_id?.toString() === companyId) {
        throw new Error('User is already a member of this company');
      }
      throw new Error('A user with this email already exists in the system');
    }

    const token = generateInviteToken('', email, companyId, role);

    // Create a placeholder user so the team list can show pending invitations
    const user = await User.create({
      email: email.toLowerCase(),
      password_hash: 'PENDING_INVITE',
      role,
      company_id: companyId,
      branch_id: branchId,
      is_active: false,
      email_verify_token: token,
      email_verify_expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await emailService.sendTeamInviteEmail(email, companyName, inviterName, token);

    return user;
  }

  async updateMemberRole(
    companyId: string,
    memberId: string,
    role: string,
    branchId?: string,
    userId?: string
  ): Promise<unknown> {
    const member = await User.findOne({ _id: memberId, company_id: companyId });

    if (!member) {
      throw new Error('Team member not found');
    }

    const oldRole = member.role;
    member.role = role;
    if (branchId !== undefined) {
      member.branch_id = branchId as unknown as typeof member.branch_id;
    }
    await member.save();

    if (userId) {
      await this.createAuditLog(
        userId,
        'company_owner',
        'team.role_changed',
        'User',
        memberId,
        { role: oldRole },
        { role }
      );
    }

    return member;
  }

  async removeTeamMember(companyId: string, memberId: string, userId: string): Promise<boolean> {
    const member = await User.findOne({ _id: memberId, company_id: companyId });

    if (!member) {
      throw new Error('Team member not found');
    }

    if (member.role === 'company_owner') {
      throw new Error('Cannot remove company owner');
    }

    const oldMember = member.toObject();
    await User.deleteOne({ _id: memberId, company_id: companyId });

    await this.createAuditLog(
      userId,
      'company_owner',
      'team.member_removed',
      'User',
      memberId,
      oldMember,
      undefined
    );

    return true;
  }

  async getTeamAuditLog(companyId: string, page = 1, limit = 50): Promise<{ logs: unknown[]; pagination: unknown }> {
    // Get all team member IDs
    const teamMembers = await User.find({ company_id: companyId }).select('_id').lean();
    const memberIds = teamMembers.map((m) => m._id);

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find({ entity_id: { $in: memberIds } })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments({ entity_id: { $in: memberIds } }),
    ]);

    return {
      logs,
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

  // ============ Jobs ============

  async getJobs(
    companyId: string,
    filters: { status?: JobStatus; page?: number; limit?: number }
  ): Promise<{ jobs: unknown[]; pagination: unknown }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { company_id: companyId };
    if (filters.status) {
      query.status = filters.status;
    }

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate('category_id', 'name slug')
        .populate('locations.branch_id', 'name city')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(query),
    ]);

    return {
      jobs,
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

  async getJobById(companyId: string, jobId: string): Promise<unknown> {
    const job = await Job.findOne({ _id: jobId, company_id: companyId })
      .populate('category_id', 'name slug icon_url')
      .populate('locations.branch_id', 'name city state country address phone email')
      .lean();

    if (!job) return null;

    // Join skills from JobSkill collection
    const jobSkills = await JobSkill.find({ job_id: job._id })
      .populate('skill_tag_id', 'name slug category')
      .lean();

    const skills = jobSkills.map((js: any) => ({
      name: js.skill_tag_id?.name ?? '',
      is_required: js.is_required ?? true,
    }));

    return { ...job, skills };
  }

  async generateJobWithAI(input: {
    title: string;
    job_type: string;
    work_mode: string;
    experience_level?: string;
    experience_min_years?: number;
    experience_max_years?: number;
  }): Promise<{
    description: string;
    responsibilities: string;
    requirements: string;
    skills: string[];
  }> {
    if (!openai) throw new Error('OpenAI API key not configured');

    // The output is purely a function of the inputs, so cache aggressively.
    // Recruiters often poke at the form (changing then reverting fields)
    // before submitting — without this cache each toggle costs a 5-10s LLM
    // round-trip and a few cents.
    const cacheKey = `company:ai:job-generate:${hashKey({
      title: input.title.trim().toLowerCase(),
      job_type: input.job_type,
      work_mode: input.work_mode,
      experience_level: input.experience_level ?? null,
      experience_min_years: input.experience_min_years ?? null,
      experience_max_years: input.experience_max_years ?? null,
    })}`;
    return withCache(cacheKey, 60 * 60, () => this.generateJobWithAIFresh(input));
  }

  async generateJobWithAIFresh(input: {
    title: string;
    job_type: string;
    work_mode: string;
    experience_level?: string;
    experience_min_years?: number;
    experience_max_years?: number;
  }): Promise<{
    description: string;
    responsibilities: string;
    requirements: string;
    skills: string[];
  }> {
    if (!openai) throw new Error('OpenAI API key not configured');

    const experienceStr = input.experience_min_years != null
      ? `${input.experience_min_years}${input.experience_max_years != null ? `–${input.experience_max_years}` : '+'} years`
      : input.experience_level ?? 'not specified';

    const jobTypeLabel: Record<string, string> = {
      full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract',
      internship: 'Internship', freelance: 'Freelance',
    };
    const workModeLabel: Record<string, string> = {
      onsite: 'On-site', remote: 'Remote', hybrid: 'Hybrid',
    };

    const prompt = `You are an expert HR professional. Generate a complete job posting for the role below.
Return ONLY a valid JSON object with exactly these keys:
{
  "description": "3-4 paragraph overview of the role, team, and company culture",
  "responsibilities": "bullet-point list (use • prefix) of 6-8 key responsibilities",
  "requirements": "bullet-point list (use • prefix) of 6-8 qualifications and requirements",
  "skills": ["array", "of", "8-12", "relevant", "skill", "tags"]
}

Role details:
- Title: ${input.title}
- Employment type: ${jobTypeLabel[input.job_type] ?? input.job_type}
- Work arrangement: ${workModeLabel[input.work_mode] ?? input.work_mode}
- Experience required: ${experienceStr}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const raw = response.choices[0].message.content ?? '{}';
    const parsed = JSON.parse(raw);

    return {
      description: parsed.description ?? '',
      responsibilities: parsed.responsibilities ?? '',
      requirements: parsed.requirements ?? '',
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    };
  }

  private async generateJobRef(companyId: string): Promise<string> {
    const company = await Company.findById(companyId).select('name').lean();
    const prefix = company
      ? company.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
      : 'JOB';
    const count = await Job.countDocuments({ company_id: companyId });
    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}-${seq}`;
  }

  async createJob(companyId: string, postedBy: string, data: JobData, userId: string, userRole: string): Promise<unknown> {
    const job_ref = await this.generateJobRef(companyId);
    const sanitizedData = sanitizeUtf8(data) as JobData;

    const job = await Job.create({
      company_id: companyId,
      posted_by: postedBy,
      job_ref,
      ...sanitizedData,
    });

    if (data.skills && data.skills.length > 0) {
      const jobSkills = data.skills.map((skill) => ({
        job_id: job._id,
        skill_tag_id: skill.skill_tag_id,
        is_required: skill.is_required ?? true,
      }));
      await JobSkill.insertMany(jobSkills);
    }

    await this.createAuditLog(
      userId,
      userRole,
      'job.created',
      'Job',
      job._id.toString(),
      undefined,
      { job_ref, title: job.title, status: job.status }
    );

    void insightsService.invalidateCompanyCache(companyId);

    return job;
  }

  async updateJob(
    companyId: string,
    jobId: string,
    data: Partial<JobData>,
    userId: string,
    userRole: string
  ): Promise<unknown> {
    try {
      // Sanitize all string values to prevent invalid UTF-8 from being stored
      const sanitizedData = sanitizeUtf8(data) as Partial<JobData>;

      // Mongoose pre-save hooks don't run on updateOne/findOneAndUpdate,
      // so we must compute GeoJSON coordinates explicitly for locations.
      if (sanitizedData.locations && Array.isArray(sanitizedData.locations)) {
        let totalOpenings = 0;
        for (const loc of sanitizedData.locations as any[]) {
          if (loc.latitude != null && loc.longitude != null) {
            loc.geo = {
              type: 'Point',
              coordinates: [loc.longitude, loc.latitude],
            };
          }
          totalOpenings += loc.openings || 0;
        }
        // Sync total openings from locations (mirrors pre-save hook logic)
        if (totalOpenings > 0 && (sanitizedData as any).openings === undefined) {
          (sanitizedData as any).openings = totalOpenings;
        }
      }

      console.log('[updateJob] sanitized data received');

      // Read old job for audit log — wrap in try/catch because existing
      // documents may already contain invalid UTF-8 bytes.
      let oldTitle: string | undefined;
      try {
        const oldJob = await Job.findOne({ _id: jobId, company_id: companyId }).select('title').lean();
        oldTitle = (oldJob as any)?.title;
      } catch (readErr) {
        console.warn('[updateJob] Could not read old job (possibly corrupted BSON), skipping audit diff:', (readErr as Error).message);
      }

      // Use updateOne to avoid deserializing the (potentially corrupted) return document
      const updateResult = await Job.updateOne(
        { _id: jobId, company_id: companyId },
        { $set: sanitizedData },
        { runValidators: true }
      );

      if (updateResult.matchedCount === 0) {
        return null;
      }

      // Now fetch the freshly-updated (sanitized) document
      let job: unknown = null;
      try {
        job = await Job.findOne({ _id: jobId, company_id: companyId })
          .populate('category_id', 'name slug icon_url')
          .populate('locations.branch_id', 'name city state country address phone email')
          .lean();
      } catch (fetchErr) {
        console.warn('[updateJob] Could not read updated job (BSON issue in non-updated fields):', (fetchErr as Error).message);
        // Return a minimal success object so the client knows the update went through
        return { _id: jobId, company_id: companyId, _updateSucceeded: true };
      }

      console.log('[updateJob] update result:', job ? `job found: ${(job as any).title}` : 'null');

      if (job) {
        try {
          await this.createAuditLog(
            userId,
            userRole,
            'job.updated',
            'Job',
            jobId,
            { title: oldTitle ?? 'unknown' },
            { title: (job as any).title }
          );
        } catch (logErr) {
          console.error('Audit log error:', logErr);
        }

        // Update skills if provided
        if (sanitizedData.skills !== undefined) {
          await JobSkill.deleteMany({ job_id: jobId });
          if (sanitizedData.skills.length > 0) {
            const jobSkills = sanitizedData.skills.map((skill: any) => ({
              job_id: jobId,
              skill_tag_id: skill.skill_tag_id,
              is_required: skill.is_required ?? true,
            }));
            await JobSkill.insertMany(jobSkills);
          }
        }
      }

      void insightsService.invalidateCompanyCache(companyId);

      return job;
    } catch (error) {
      console.error('Error updating job:', error);
      throw error;
    }
  }

  async deleteJob(companyId: string, jobId: string, userId: string, userRole: string): Promise<boolean> {
    const job = await Job.findOne({ _id: jobId, company_id: companyId });

    if (!job) return false;

    if (!['draft', 'closed'].includes(job.status)) {
      throw new Error('Can only delete draft or closed jobs');
    }

    await Job.deleteOne({ _id: jobId, company_id: companyId });
    await JobSkill.deleteMany({ job_id: jobId });

    await this.createAuditLog(
      userId,
      userRole,
      'job.deleted',
      'Job',
      jobId,
      { job_ref: job.job_ref, title: job.title },
      undefined
    );

    void insightsService.invalidateCompanyCache(companyId);

    return true;
  }

  async publishJob(companyId: string, jobId: string, userId: string, userRole: string): Promise<unknown> {
    const job = await Job.findOne({ _id: jobId, company_id: companyId });

    if (!job) throw new Error('Job not found');
    if (job.status !== 'draft') {
      throw new Error('Only draft jobs can be published');
    }

    job.status = 'active';
    await job.save();

    await this.createAuditLog(
      userId,
      userRole,
      'job.published',
      'Job',
      jobId,
      { status: 'draft' },
      { status: 'active' }
    );

    void insightsService.invalidateCompanyCache(companyId);

    return job;
  }

  async closeJob(companyId: string, jobId: string, userId: string, userRole: string): Promise<unknown> {
    const job = await Job.findOne({ _id: jobId, company_id: companyId });

    if (!job) throw new Error('Job not found');
    if (job.status !== 'active') {
      throw new Error('Only active jobs can be closed');
    }

    job.status = 'closed';
    await job.save();

    await this.createAuditLog(
      userId,
      userRole,
      'job.closed',
      'Job',
      jobId,
      { status: 'active' },
      { status: 'closed' }
    );

    void insightsService.invalidateCompanyCache(companyId);

    return job;
  }

  async duplicateJob(companyId: string, jobId: string, userId: string, userRole: string): Promise<unknown> {
    const originalJob = await Job.findOne({ _id: jobId, company_id: companyId });

    if (!originalJob) throw new Error('Job not found');

    const job_ref = await this.generateJobRef(companyId);

    const duplicatedJob = await Job.create({
      ...originalJob.toObject(),
      _id: undefined,
      __v: undefined,
      job_ref,
      title: `${originalJob.title} (Copy)`,
      status: 'draft',
      views_count: 0,
      createdAt: undefined,
      updatedAt: undefined,
    });

    const originalSkills = await JobSkill.find({ job_id: jobId });
    if (originalSkills.length > 0) {
      const newSkills = originalSkills.map((skill) => ({
        job_id: duplicatedJob._id,
        skill_tag_id: skill.skill_tag_id,
        is_required: skill.is_required,
      }));
      await JobSkill.insertMany(newSkills);
    }

    await this.createAuditLog(
      userId,
      userRole,
      'job.duplicated',
      'Job',
      duplicatedJob._id.toString(),
      undefined,
      { job_ref, original_job_id: jobId, title: duplicatedJob.title }
    );

    return duplicatedJob;
  }

  // ============ Applicants ============

  async getApplicants(
    companyId: string,
    jobId: string,
    filters: { status?: ApplicationStatus; page?: number; limit?: number }
  ): Promise<{ applications: unknown[]; pagination: unknown }> {
    // Verify job belongs to company
    const job = await Job.findOne({ _id: jobId, company_id: companyId });
    if (!job) throw new Error('Job not found');

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { job_id: jobId };
    if (filters.status) {
      query.status = filters.status;
    }

    const [applications, total] = await Promise.all([
      Application.find(query)
        .populate('seeker_id', 'first_name last_name headline city country avatar_url')
        .populate('resume_id', 'file_url label')
        .populate('referred_by', 'email')
        .sort({ applied_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Application.countDocuments(query),
    ]);

    const enriched = await enrichWithReferrer(applications);

    return {
      applications: enriched,
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

  async getApplicantDetail(
    companyId: string,
    jobId: string,
    applicationId: string
  ): Promise<unknown> {
    // Verify job belongs to company
    const job = await Job.findOne({ _id: jobId, company_id: companyId });
    if (!job) throw new Error('Job not found');

    const application = await Application.findOne({ _id: applicationId, job_id: jobId })
      .populate('seeker_id')
      .populate('resume_id')
      .lean();

    if (!application) throw new Error('Application not found');

    // Get status history
    const statusHistory = await ApplicationStatusHistory.find({ application_id: applicationId })
      .sort({ changed_at: -1 })
      .lean();

    return {
      ...application,
      status_history: statusHistory,
    };
  }

  async updateApplicationStatus(
    companyId: string,
    jobId: string,
    applicationId: string,
    newStatus: ApplicationStatus,
    userId: string,
    userRole: string,
    note?: string
  ): Promise<unknown> {
    // Verify job belongs to company
    const job = await Job.findOne({ _id: jobId, company_id: companyId });
    if (!job) throw new Error('Job not found');

    const application = await Application.findOne({ _id: applicationId, job_id: jobId });
    if (!application) throw new Error('Application not found');

    const oldStatus = application.status;

    // Validate transition
    this.validateStatusTransition(oldStatus, newStatus, userRole);

    application.status = newStatus;
    await application.save();

    // Create status history entry
    await ApplicationStatusHistory.create({
      application_id: applicationId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: userId,
      changed_by_role: userRole,
      note,
    });

    await this.createAuditLog(
      userId,
      userRole,
      'application.status_changed',
      'Application',
      applicationId,
      { status: oldStatus },
      { status: newStatus }
    );

    // Publish event to BullMQ
    await eventQueue.add('application.status.changed', {
      applicationId,
      jobId,
      seekerId: application.seeker_id.toString(),
      oldStatus,
      newStatus,
    });

    return application;
  }

  async addApplicantNote(
    companyId: string,
    jobId: string,
    applicationId: string,
    authorId: string,
    noteText: string
  ): Promise<unknown> {
    // Verify job belongs to company
    const job = await Job.findOne({ _id: jobId, company_id: companyId });
    if (!job) throw new Error('Job not found');

    const application = await Application.findOne({ _id: applicationId, job_id: jobId });
    if (!application) throw new Error('Application not found');

    const note = await ApplicationNote.create({
      application_id: applicationId,
      author_id: authorId,
      note: noteText,
    });

    await this.createAuditLog(
      authorId,
      'company_user',
      'application.note_added',
      'ApplicationNote',
      note._id.toString(),
      undefined,
      { application_id: applicationId }
    );

    return note;
  }

  async getApplicantNotes(
    companyId: string,
    jobId: string,
    applicationId: string
  ): Promise<unknown[]> {
    // Verify job belongs to company
    const job = await Job.findOne({ _id: jobId, company_id: companyId });
    if (!job) throw new Error('Job not found');

    return ApplicationNote.find({ application_id: applicationId })
      .populate('author_id', 'first_name last_name email')
      .sort({ created_at: -1 })
      .lean();
  }

  async getApplicantResume(
    companyId: string,
    jobId: string,
    applicationId: string
  ): Promise<unknown> {
    // Verify job belongs to company
    const job = await Job.findOne({ _id: jobId, company_id: companyId });
    if (!job) throw new Error('Job not found');

    const application = await Application.findOne({ _id: applicationId, job_id: jobId })
      .populate('resume_id')
      .lean();

    if (!application) throw new Error('Application not found');

    return application.resume_id;
  }

  // ============ Interviews ============

  async scheduleInterview(
    companyId: string,
    jobId: string,
    applicationId: string,
    scheduledBy: string,
    data: {
      interview_date: string;
      format: string;
      location_or_link?: string;
      notes?: string;
    },
    scheduledByRole?: string
  ): Promise<unknown> {
    // Verify job belongs to company
    const job = await Job.findOne({ _id: jobId, company_id: companyId });
    if (!job) throw new Error('Job not found');

    const application = await Application.findOne({ _id: applicationId, job_id: jobId });
    if (!application) throw new Error('Application not found');

    const interview = await Interview.create({
      application_id: applicationId,
      scheduled_by: scheduledBy,
      interview_date: data.interview_date,
      format: data.format,
      location_or_link: data.location_or_link,
      notes: data.notes,
      status: 'scheduled',
    });

    // Capture the prior status BEFORE we mutate it so the audit row is accurate
    // for callers that scheduled directly from a non-shortlisted state (e.g.
    // straight from "applied"/"reviewed" with the relaxed transition rules).
    const oldStatus = application.status;
    application.status = 'interview_scheduled';
    await application.save();

    await ApplicationStatusHistory.create({
      application_id: applicationId,
      old_status: oldStatus,
      new_status: 'interview_scheduled',
      changed_by: scheduledBy,
      // ApplicationStatusHistory only allows job_seeker | company_owner |
      // hr_manager | recruiter | admin. Default to hr_manager when caller
      // didn't supply a role (rather than crashing the endpoint).
      changed_by_role: this.normalizeActorRole(scheduledByRole),
    });

    await this.createAuditLog(
      scheduledBy,
      'company_user',
      'interview.scheduled',
      'Interview',
      interview._id.toString(),
      undefined,
      {
        application_id: applicationId,
        interview_date: data.interview_date,
        format: data.format,
      }
    );

    // Publish event
    await eventQueue.add('interview.scheduled', {
      interviewId: interview._id.toString(),
      applicationId,
      jobId,
      seekerId: application.seeker_id.toString(),
      interviewDate: data.interview_date,
      format: data.format,
    });

    // Email the candidate the date/time/meet link.
    try {
      const seeker = await SeekerProfile.findById(application.seeker_id)
        .populate('user_id', 'email')
        .lean();
      const company = await Company.findById(companyId).select('name').lean();
      const candidateEmail = (seeker?.user_id as unknown as { email?: string } | undefined)?.email;
      if (candidateEmail) {
        await emailService.sendInterviewInviteEmail({
          to: candidateEmail,
          candidateName: seeker?.first_name,
          jobTitle: job.title,
          companyName: company?.name ?? 'the company',
          interviewDate: new Date(data.interview_date),
          format: data.format as 'video' | 'phone' | 'in_person',
          locationOrLink: data.location_or_link,
          notes: data.notes,
        });
      }
    } catch (mailErr) {
      // Email failures shouldn't roll back the schedule — surface in logs only.
      console.error('Failed to queue interview invite email:', mailErr);
    }

    return interview;
  }

  async updateInterview(
    interviewId: string,
    data: {
      interview_date?: string;
      format?: string;
      location_or_link?: string;
      notes?: string;
      status?: string;
    },
    userId: string
  ): Promise<unknown> {
    const interview = await Interview.findByIdAndUpdate(
      interviewId,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    if (!interview) throw new Error('Interview not found');

    await this.createAuditLog(
      userId,
      'company_user',
      'interview.updated',
      'Interview',
      interviewId,
      undefined,
      data
    );

    return interview;
  }

  // ============ Dashboard ============

  async getDashboardStats(companyId: string, period = '30d'): Promise<unknown> {
    const now = new Date();
    const periodDays = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const dayMs = 24 * 60 * 60 * 1000;
    const startDate = new Date(now.getTime() - periodDays * dayMs);
    const prevStartDate = new Date(now.getTime() - 2 * periodDays * dayMs);
    const sevenDaysAgo = new Date(now.getTime() - 7 * dayMs);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * dayMs);
    const sixDayWindow = new Date(now.getTime() - 6 * dayMs);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Mongoose's aggregate() does NOT auto-cast strings → ObjectId in $match,
    // so any pipeline filtering by company_id MUST use this ObjectId.
    const companyObjectId = new mongoose.Types.ObjectId(companyId);
    const jobIds = await Job.find({ company_id: companyObjectId }).distinct('_id');

    const [
      activeJobs,
      closingThisWeek,
      totalApplications,
      prevApplications,
      recentApplications,
      statusBreakdown,
      lifetimePipeline,
      monthlyViewsCount,
      lifetimeViewsAgg,
      ttHired,
      ttHiredPrev,
      trendBuckets,
      topJobs,
      todayInterviews,
      noApplicants,
      stalledJobs,
      branchDistribution,
    ] = await Promise.all([
      Job.countDocuments({ company_id: companyId, status: 'active' }),
      Job.countDocuments({
        company_id: companyId,
        status: 'active',
        application_deadline: { $gte: now, $lte: new Date(now.getTime() + 7 * dayMs) },
      }),
      Application.countDocuments({
        job_id: { $in: jobIds },
        applied_at: { $gte: startDate },
      }),
      Application.countDocuments({
        job_id: { $in: jobIds },
        applied_at: { $gte: prevStartDate, $lt: startDate },
      }),
      Application.find({
        job_id: { $in: jobIds },
        applied_at: { $gte: startDate },
      })
        .sort({ applied_at: -1 })
        .limit(10)
        .populate('job_id', 'title')
        .lean(),
      Application.aggregate([
        {
          $match: {
            job_id: { $in: jobIds },
            applied_at: { $gte: startDate },
          },
        },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Application.aggregate([
        { $match: { job_id: { $in: jobIds } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Time-bounded views: count JobView events within the period.
      JobView.countDocuments({
        company_id: companyObjectId,
        ts: { $gte: startDate },
      }),
      // Lifetime views fallback (sum of Job.views_count) — used as a stable
      // metric when JobView has not yet accumulated data for older companies.
      Job.aggregate([
        { $match: { company_id: companyObjectId } },
        { $group: { _id: null, total: { $sum: '$views_count' } } },
      ]),
      Application.aggregate([
        {
          $match: {
            job_id: { $in: jobIds },
            status: 'hired',
            updated_at: { $gte: startDate },
          },
        },
        {
          $project: {
            days: { $divide: [{ $subtract: ['$updated_at', '$applied_at'] }, dayMs] },
          },
        },
        { $group: { _id: null, avgDays: { $avg: '$days' } } },
      ]),
      Application.aggregate([
        {
          $match: {
            job_id: { $in: jobIds },
            status: 'hired',
            updated_at: { $gte: prevStartDate, $lt: startDate },
          },
        },
        {
          $project: {
            days: { $divide: [{ $subtract: ['$updated_at', '$applied_at'] }, dayMs] },
          },
        },
        { $group: { _id: null, avgDays: { $avg: '$days' } } },
      ]),
      Application.aggregate([
        { $match: { job_id: { $in: jobIds }, applied_at: { $gte: sixDayWindow } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$applied_at' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Job.aggregate([
        {
          $match: {
            company_id: companyObjectId,
            status: { $in: ['active', 'closed'] },
          },
        },
        {
          $lookup: {
            from: 'applications',
            localField: '_id',
            foreignField: 'job_id',
            as: 'applications',
          },
        },
        { $addFields: { applicantsCount: { $size: '$applications' } } },
        { $sort: { views_count: -1, applicantsCount: -1 } },
        { $limit: 5 },
        {
          $project: {
            id: '$_id',
            _id: 0,
            title: 1,
            status: 1,
            applicantsCount: 1,
            viewsCount: '$views_count',
            location: { $ifNull: [{ $arrayElemAt: ['$locations.label', 0] }, ''] },
          },
        },
      ]),
      Interview.aggregate([
        {
          $match: {
            interview_date: { $gte: todayStart, $lte: todayEnd },
            status: 'scheduled',
          },
        },
        {
          $lookup: {
            from: 'applications',
            localField: 'application_id',
            foreignField: '_id',
            as: 'application',
          },
        },
        { $unwind: '$application' },
        { $match: { 'application.job_id': { $in: jobIds } } },
        {
          $lookup: {
            from: 'seekerprofiles',
            localField: 'application.seeker_id',
            foreignField: '_id',
            as: 'seeker',
          },
        },
        { $unwind: { path: '$seeker', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'jobs',
            localField: 'application.job_id',
            foreignField: '_id',
            as: 'job',
          },
        },
        { $unwind: '$job' },
        { $sort: { interview_date: 1 } },
        { $limit: 6 },
        {
          $project: {
            id: '$_id',
            _id: 0,
            interviewDate: '$interview_date',
            format: 1,
            locationOrLink: '$location_or_link',
            candidateName: {
              $trim: {
                input: {
                  $concat: [
                    { $ifNull: ['$seeker.first_name', 'Candidate'] },
                    ' ',
                    { $ifNull: ['$seeker.last_name', ''] },
                  ],
                },
              },
            },
            candidateAvatar: '$seeker.avatar_url',
            jobTitle: '$job.title',
            applicationId: '$application._id',
          },
        },
      ]),
      Job.aggregate([
        { $match: { company_id: companyObjectId, status: 'active' } },
        {
          $lookup: {
            from: 'applications',
            let: { jid: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$job_id', '$$jid'] },
                  applied_at: { $gte: sevenDaysAgo },
                },
              },
            ],
            as: 'recentApps',
          },
        },
        { $match: { recentApps: { $size: 0 } } },
        { $sort: { createdAt: 1 } },
        { $limit: 3 },
        {
          $project: {
            id: '$_id',
            _id: 0,
            title: 1,
            location: { $ifNull: [{ $arrayElemAt: ['$locations.label', 0] }, ''] },
            type: { $literal: 'no_applicants' },
            days: { $literal: 7 },
          },
        },
      ]),
      Job.aggregate([
        { $match: { company_id: companyObjectId, status: 'active' } },
        {
          $lookup: {
            from: 'applications',
            localField: '_id',
            foreignField: 'job_id',
            as: 'applications',
          },
        },
        {
          $match: {
            'applications.0': { $exists: true },
            $expr: { $lt: [{ $max: '$applications.updated_at' }, fourteenDaysAgo] },
          },
        },
        { $limit: 3 },
        {
          $project: {
            id: '$_id',
            _id: 0,
            title: 1,
            location: { $ifNull: [{ $arrayElemAt: ['$locations.label', 0] }, ''] },
            type: { $literal: 'stalled' },
            days: { $literal: 14 },
          },
        },
      ]),
      Application.aggregate([
        { $match: { job_id: { $in: jobIds } } },
        {
          $lookup: {
            from: 'jobs',
            localField: 'job_id',
            foreignField: '_id',
            as: 'job',
          },
        },
        { $unwind: '$job' },
        { $unwind: { path: '$job.locations', preserveNullAndEmptyArrays: true } },
        { $match: { 'job.locations.branch_id': { $ne: null } } },
        { $group: { _id: '$job.locations.branch_id', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'companybranches',
            localField: '_id',
            foreignField: '_id',
            as: 'branch',
          },
        },
        { $unwind: { path: '$branch', preserveNullAndEmptyArrays: false } },
        { $sort: { count: -1 } },
        { $limit: 6 },
        {
          $project: {
            id: '$_id',
            _id: 0,
            name: '$branch.name',
            city: '$branch.city',
            count: 1,
          },
        },
      ]),
    ]);

    const trendMap = new Map<string, number>(
      (trendBuckets as { _id: string; count: number }[]).map((b) => [b._id, b.count])
    );
    const applicantsTrend: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getTime() - i * dayMs);
      const key = d.toISOString().slice(0, 10);
      applicantsTrend.push(trendMap.get(key) ?? 0);
    }

    const lifetimeStatusMap = (lifetimePipeline as { _id: string; count: number }[]).reduce(
      (acc, item) => ({ ...acc, [item._id]: item.count }),
      {} as Record<string, number>
    );
    const pipeline = {
      applied: (lifetimeStatusMap.applied ?? 0) + (lifetimeStatusMap.reviewed ?? 0),
      shortlisted: lifetimeStatusMap.shortlisted ?? 0,
      interview: lifetimeStatusMap.interview_scheduled ?? 0,
      offer: lifetimeStatusMap.offer_extended ?? 0,
      hired: lifetimeStatusMap.hired ?? 0,
    };

    // Prefer the time-bounded JobView count. If it's zero (e.g., view tracking
    // was just enabled and no events have been logged for this period yet),
    // fall back to the lifetime Job.views_count sum so the dashboard isn't
    // misleadingly empty for old companies.
    const lifetimeViews = (lifetimeViewsAgg as { total: number }[])[0]?.total ?? 0;
    const monthlyViews =
      (monthlyViewsCount as number) > 0 ? (monthlyViewsCount as number) : lifetimeViews;
    const avgTimeToHire = Math.round((ttHired as { avgDays: number }[])[0]?.avgDays ?? 0);
    const prevTimeToHire = Math.round((ttHiredPrev as { avgDays: number }[])[0]?.avgDays ?? 0);
    const timeToHireDelta = prevTimeToHire ? prevTimeToHire - avgTimeToHire : 0;

    const applicantsDelta =
      prevApplications > 0
        ? Math.round(((totalApplications - prevApplications) / prevApplications) * 100)
        : totalApplications > 0
          ? 100
          : 0;

    const totalBranchApps =
      (branchDistribution as { count: number }[]).reduce((s, b) => s + b.count, 0) || 0;
    const branchDistributionWithPct = (branchDistribution as { id: unknown; name: string; city: string; count: number }[]).map(
      (b) => ({
        ...b,
        percentage: totalBranchApps > 0 ? Math.round((b.count / totalBranchApps) * 100) : 0,
      })
    );

    const needingAttention = [
      ...(noApplicants as unknown[]),
      ...(stalledJobs as unknown[]),
    ].slice(0, 5);

    const recentMapped = (recentApplications as unknown[]).map((a) => {
      const app = a as {
        _id: unknown;
        seeker_id: unknown;
        status: string;
        applied_at: Date;
        job_id: { title?: string } | null;
      };
      return {
        id: app._id,
        seekerId: app.seeker_id,
        seekerName: '',
        seekerAvatar: '',
        jobTitle: app.job_id?.title ?? '',
        status: app.status,
        appliedAt: app.applied_at,
      };
    });

    return {
      period,
      activeJobs,
      closingThisWeek,
      totalApplications,
      totalApplicants: totalApplications,
      applicantsDelta,
      monthlyViews,
      thisMonthViews: monthlyViews,
      lifetimeViews,
      avgTimeToHire,
      timeToHireDelta,
      applicantsTrend,
      pipeline,
      statusBreakdown: (statusBreakdown as { _id: string; count: number }[]).reduce(
        (acc, item) => ({ ...acc, [item._id]: item.count }),
        {}
      ),
      topJobs,
      todayInterviews,
      needingAttention,
      branchDistribution: branchDistributionWithPct,
      recentApplications: recentMapped,
    };
  }

  async getDashboardPipeline(companyId: string): Promise<unknown[]> {
    const jobIds = await Job.find({ company_id: companyId }).distinct('_id');

    return Application.aggregate([
      { $match: { job_id: { $in: jobIds } } },
      {
        $group: {
          _id: {
            job_id: '$job_id',
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'jobs',
          localField: '_id.job_id',
          foreignField: '_id',
          as: 'job',
        },
      },
      { $unwind: '$job' },
      {
        $project: {
          job_id: '$_id.job_id',
          job_title: '$job.title',
          status: '$_id.status',
          count: 1,
          _id: 0,
        },
      },
      { $sort: { job_title: 1, status: 1 } },
    ]);
  }

  async getTopJobs(companyId: string, limit = 5): Promise<unknown[]> {
    return Job.aggregate([
      { $match: { company_id: new mongoose.Types.ObjectId(companyId) } },
      {
        $lookup: {
          from: 'applications',
          localField: '_id',
          foreignField: 'job_id',
          as: 'applications',
        },
      },
      {
        $addFields: {
          applicationCount: { $size: '$applications' },
        },
      },
      { $sort: { applicationCount: -1 } },
      { $limit: limit },
      {
        $project: {
          title: 1,
          status: 1,
          applicationCount: 1,
          createdAt: 1,
        },
      },
    ]);
  }

  // ============ Helpers ============

  /**
   * Coerce a free-form actor role into one of the values
   * ApplicationStatusHistory.changed_by_role accepts. Anything that isn't one
   * of those five maps to 'hr_manager' so the audit row still saves.
   */
  private normalizeActorRole(role?: string): 'job_seeker' | 'company_owner' | 'hr_manager' | 'recruiter' | 'admin' {
    switch (role) {
      case 'job_seeker':
      case 'company_owner':
      case 'hr_manager':
      case 'recruiter':
      case 'admin':
        return role;
      default:
        return 'hr_manager';
    }
  }

  private validateStatusTransition(
    currentStatus: ApplicationStatus,
    newStatus: ApplicationStatus,
    userRole: string
  ): void {
    // Define allowed transitions
    const allowedTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
      applied: ['reviewed', 'rejected'],
      reviewed: ['shortlisted', 'rejected'],
      shortlisted: ['interview_scheduled', 'rejected'],
      interview_scheduled: ['offer_extended', 'rejected'],
      offer_extended: ['hired', 'rejected'],
      hired: [],
      rejected: [],
      withdrawn: [],
    };

    // Only company roles can make transitions (except withdrawn by seeker)
    if (!['company_owner', 'hr_manager', 'recruiter'].includes(userRole)) {
      if (newStatus === 'withdrawn') {
        // Seeker can withdraw
        return;
      }
      throw new Error('Not authorized to change application status');
    }

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }
  }

  async createOrGetSkillTag(name: string): Promise<unknown> {
    const trimmed = name.trim();
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await SkillTag.findOne({ name: { $regex: new RegExp(`^${trimmed}$`, 'i') } }).lean();
    if (existing) return existing;
    return SkillTag.create({ name: trimmed, slug, is_active: true });
  }

  private async createAuditLog(
    actorId: string,
    actorRole: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValue?: unknown,
    newValue?: unknown
  ): Promise<void> {
    try {
      await AuditLog.create({
        actor_id: actorId,
        actor_role: actorRole,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_value: oldValue,
        new_value: newValue,
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  // ============ Flat Applicant API (jobId resolved from application) ============

  /**
   * List every applicant across all of this company's jobs.
   * Used by the company-wide Applicants page.
   */
  async listApplicantsForCompany(
    companyId: string,
    filters: { status?: ApplicationStatus; jobId?: string; q?: string; page?: number; limit?: number; referred_only?: boolean }
  ): Promise<{ applications: unknown[]; pagination: unknown }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const jobQuery: Record<string, unknown> = { company_id: companyId };
    if (filters.jobId) jobQuery._id = filters.jobId;
    const jobs = await Job.find(jobQuery).select('_id').lean();
    const jobIds = jobs.map((j) => j._id);

    if (jobIds.length === 0) {
      return {
        applications: [],
        pagination: { total: 0, page, limit, totalPages: 0, hasNext: false, hasPrev: false },
      };
    }

    const query: Record<string, unknown> = { job_id: { $in: jobIds } };
    if (filters.status) query.status = filters.status;

    if (filters.referred_only) {
      query.referred_by = { $exists: true, $ne: null };
    }

    const [applications, total] = await Promise.all([
      Application.find(query)
        .populate('seeker_id', 'first_name last_name headline city country avatar_url')
        .populate('job_id', 'title slug')
        .populate('resume_id', 'file_url original_name label')
        .populate('referred_by', 'email')
        .sort({ applied_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Application.countDocuments(query),
    ]);

    const enriched = await enrichWithReferrer(applications);

    return {
      applications: enriched,
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

  /**
   * Resolve an application by id, ensuring its job belongs to the given company.
   * Throws if not found or wrong company.
   */
  private async findApplicationForCompany(companyId: string, applicationId: string) {
    const application = await Application.findById(applicationId);
    if (!application) throw new Error('Application not found');
    const job = await Job.findOne({ _id: application.job_id, company_id: companyId });
    if (!job) throw new Error('Application not found');
    return { application, job };
  }

  /**
   * Full applicant detail including the candidate's structured profile.
   * Used by the ApplicantDetail page so it can render skills/education/experience
   * and so AI screening has the data it needs.
   */
  async getApplicantFullDetail(companyId: string, applicationId: string): Promise<unknown> {
    const { application, job } = await this.findApplicationForCompany(companyId, applicationId);

    const [populated, statusHistory, seekerSkills, education, experience, user] = await Promise.all([
      Application.findById(applicationId)
        .populate('seeker_id')
        .populate('resume_id')
        .lean(),
      ApplicationStatusHistory.find({ application_id: applicationId })
        .sort({ changed_at: -1 })
        .lean(),
      SeekerSkill.find({ seeker_id: application.seeker_id })
        .populate('skill_tag_id', 'name')
        .lean(),
      Education.find({ seeker_id: application.seeker_id }).sort({ start_date: -1 }).lean(),
      WorkExperience.find({ seeker_id: application.seeker_id }).sort({ start_date: -1 }).lean(),
      // SeekerProfile.user_id → User.email/phone
      (async () => {
        const sp = await SeekerProfile.findById(application.seeker_id).select('user_id').lean();
        if (!sp?.user_id) return null;
        return User.findById(sp.user_id).select('email').lean();
      })(),
    ]);

    const interviews = await Interview.find({ application_id: applicationId })
      .sort({ interview_date: -1 })
      .lean();

    return {
      ...populated,
      job: { _id: job._id, title: job.title, slug: job.slug },
      candidate_email: user?.email ?? null,
      skills: seekerSkills.map((s) => ({
        _id: s._id,
        proficiency: s.proficiency,
        skill_tag_id: s.skill_tag_id,
      })),
      education,
      experience,
      interviews,
      status_history: statusHistory,
    };
  }

  /**
   * Run the AI resume screening. Uses the candidate's structured profile
   * (skills, education, experience, headline, bio) plus the job description as
   * context — we don't parse the PDF in-band. Persists the result on the
   * application.
   */
  async screenApplicant(
    companyId: string,
    applicationId: string,
    userId: string,
    options?: { force?: boolean }
  ): Promise<unknown> {
    if (!openai) throw new Error('OpenAI API key not configured');

    const { application, job } = await this.findApplicationForCompany(companyId, applicationId);

    // Per-applicant screening is deterministic enough that a re-screen
    // typically just re-renders the same scorecard. Return the saved result
    // unless the caller explicitly asked for a fresh AI run.
    const existingScreening = (application as unknown as { ai_screening?: unknown }).ai_screening;
    if (existingScreening && !options?.force) {
      return existingScreening;
    }

    const [seeker, skills, education, experience] = await Promise.all([
      SeekerProfile.findById(application.seeker_id).lean(),
      SeekerSkill.find({ seeker_id: application.seeker_id })
        .populate('skill_tag_id', 'name')
        .lean(),
      Education.find({ seeker_id: application.seeker_id }).sort({ start_date: -1 }).lean(),
      WorkExperience.find({ seeker_id: application.seeker_id }).sort({ start_date: -1 }).lean(),
    ]);

    const skillNames = skills
      .map((s) => (s.skill_tag_id as unknown as { name?: string } | null)?.name)
      .filter(Boolean) as string[];

    const eduSummary = education
      .map((e) => `${e.degree ?? ''} ${e.field_of_study ?? ''} @ ${e.institution ?? ''} (${e.start_date ?? ''}–${e.is_current ? 'present' : (e.end_date ?? '')})`.trim())
      .join('\n');

    const expSummary = experience
      .map((x) => `${x.job_title ?? ''} @ ${x.company_name ?? ''} (${x.start_date ?? ''}–${x.is_current ? 'present' : (x.end_date ?? '')})${x.description ? `: ${x.description}` : ''}`.trim())
      .join('\n');

    const prompt = `You are a recruiting assistant. Score how well this candidate fits the role on a 0-100 scale and provide a structured assessment.

Return ONLY a valid JSON object with these keys:
{
  "score": number (0-100),
  "recommendation": "strong_match" | "possible_match" | "weak_match" | "not_a_match",
  "summary": "2-3 sentence overall fit assessment",
  "strengths": ["3-5 specific strengths matching the role"],
  "gaps": ["2-4 specific gaps or risks"]
}

Job:
- Title: ${job.title}
- Description: ${(job as unknown as { description?: string }).description ?? ''}
- Required skills: ${(job as unknown as { requirements?: string }).requirements ?? ''}

Candidate:
- Headline: ${seeker?.headline ?? ''}
- Bio: ${seeker?.bio ?? ''}
- Skills: ${skillNames.join(', ') || 'none listed'}
- Education:
${eduSummary || 'none listed'}
- Experience:
${expSummary || 'none listed'}
- Cover letter: ${application.cover_letter_text ?? 'none'}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const raw = response.choices[0].message.content ?? '{}';
    const parsed = JSON.parse(raw);

    const validRecs = ['strong_match', 'possible_match', 'weak_match', 'not_a_match'];
    const screening = {
      score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
      recommendation: validRecs.includes(parsed.recommendation) ? parsed.recommendation : 'possible_match',
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps.map(String) : [],
      screened_at: new Date(),
      screened_by: userId as unknown as import('mongoose').Types.ObjectId,
    };

    application.set('ai_screening', screening);
    await application.save();

    await this.createAuditLog(userId, 'company_user', 'application.ai_screened',
      'Application', applicationId, undefined, { score: screening.score, recommendation: screening.recommendation });

    return screening;
  }

  /**
   * Mark an offer as extended and email the candidate.
   * Wraps updateApplicationStatus with the email side effect.
   */
  async extendOffer(
    companyId: string,
    applicationId: string,
    userId: string,
    userRole: string,
    note?: string
  ): Promise<unknown> {
    const { application, job } = await this.findApplicationForCompany(companyId, applicationId);
    const result = await this.updateApplicationStatus(
      companyId, application.job_id.toString(), applicationId, 'offer_extended' as ApplicationStatus, userId, userRole, note
    );

    try {
      const seeker = await SeekerProfile.findById(application.seeker_id)
        .populate('user_id', 'email')
        .lean();
      const company = await Company.findById(companyId).select('name').lean();
      const candidateEmail = (seeker?.user_id as unknown as { email?: string } | undefined)?.email;
      if (candidateEmail) {
        await emailService.sendOfferExtendedEmail({
          to: candidateEmail,
          candidateName: seeker?.first_name,
          jobTitle: job.title,
          companyName: company?.name ?? 'the company',
          note,
        });
      }
    } catch (mailErr) {
      console.error('Failed to queue offer email:', mailErr);
    }

    return result;
  }
}

/**
 * Enrich a list of Applications with referrer info — looks up the
 * EmploymentOfficialProfile by user_id for any application that has a
 * referred_by populated. Adds `referrer` to the row when present.
 */
async function enrichWithReferrer(applications: any[]): Promise<any[]> {
  const referrerUserIds = applications
    .map((a) => {
      const r = a.referred_by;
      if (!r) return null;
      if (typeof r === 'object' && r._id) return r._id.toString();
      return r.toString();
    })
    .filter((id): id is string => Boolean(id));

  if (referrerUserIds.length === 0) return applications;

  const uniqueIds = Array.from(new Set(referrerUserIds));
  const profiles = await EmploymentOfficialProfile.find({ user_id: { $in: uniqueIds } })
    .select('user_id first_name last_name designation avatar_url')
    .lean();

  const byUserId = new Map<string, any>();
  for (const p of profiles) {
    byUserId.set(p.user_id.toString(), p);
  }

  return applications.map((a) => {
    const r = a.referred_by;
    if (!r) return a;
    const userId = typeof r === 'object' && r._id ? r._id.toString() : r.toString();
    const prof = byUserId.get(userId);
    if (!prof) return a;
    return {
      ...a,
      referrer: {
        user_id: userId,
        email: typeof r === 'object' ? r.email : undefined,
        first_name: prof.first_name,
        last_name: prof.last_name,
        designation: prof.designation,
        avatar_url: prof.avatar_url,
      },
    };
  });
}

export const companyService = new CompanyService();
export default companyService;
