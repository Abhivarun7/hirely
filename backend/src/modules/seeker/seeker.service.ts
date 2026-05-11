import {
  SeekerProfile,
  Education,
  WorkExperience,
  SeekerSkill,
  Certification,
  Resume,
  Job,
  JobSkill,
  Application,
  SavedJob,
  Notification,
  AuditLog,
  SkillTag,
  Company,
} from '../../models/index.js';
import { PaginatedResult, ApplicationStatus, Visibility } from '../../types/index.js';
import { Queue } from 'bullmq';
import { redis } from '../../config/redis.js';
import { homeService } from './home.service.js';
import { insightsService } from '../company/insights.service.js';

// Event queue for application status changes and notifications
const eventQueue = new Queue('events', { connection: redis });

function fireAndForgetCacheInvalidation(seekerProfileId: string, full = false): void {
  const op = full
    ? homeService.invalidateAllForSeeker(seekerProfileId)
    : homeService.invalidateRecoCache(seekerProfileId);
  op.catch(() => {});
}

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  city?: string;
  state?: string;
  country?: string;
  headline?: string;
  bio?: string;
  avatar_url?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
}

export interface EducationData {
  institution?: string;
  degree?: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  gpa?: number;
  description?: string;
}

export interface ExperienceData {
  company_name?: string;
  job_title?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  description?: string;
}

export interface SkillData {
  skill_tag_id: string;
  proficiency: 'beginner' | 'intermediate' | 'expert';
}

export interface CertificationData {
  name?: string;
  issuer?: string;
  issue_date?: string;
  expiry_date?: string;
  credential_url?: string;
}

export interface ResumeData {
  label?: string;
  original_name?: string;
  file_url: string;
  file_size_kb?: number;
}

export interface JobSearchFilters {
  q?: string;
  city?: string;
  near?: string;
  radius_km?: number;
  job_type?: string;
  work_mode?: string;
  category_id?: string;
  experience_level?: string;
  salary_min?: number;
  salary_max?: number;
  page?: number;
  limit?: number;
}

export class SeekerService {
  /**
   * Get seeker profile by user ID
   */
  async getProfile(seekerProfileId: string): Promise<unknown> {
    const profile = await SeekerProfile.findById(seekerProfileId).lean();
    if (!profile) return null;

    // Fetch related data in parallel
    const [education, experience, skills, certifications, resumes] = await Promise.all([
      Education.find({ seeker_id: seekerProfileId }).sort({ start_date: -1 }).lean(),
      WorkExperience.find({ seeker_id: seekerProfileId }).sort({ start_date: -1 }).lean(),
      SeekerSkill.find({ seeker_id: seekerProfileId })
        .populate('skill_tag_id', 'name slug category')
        .lean(),
      Certification.find({ seeker_id: seekerProfileId }).sort({ issue_date: -1 }).lean(),
      Resume.find({ seeker_id: seekerProfileId }).sort({ uploaded_at: -1 }).lean(),
    ]);

    return {
      ...profile,
      education,
      experience,
      skills: skills.map((s) => ({
        _id: s._id,
        proficiency: s.proficiency,
        skill_tag_id: s.skill_tag_id,
      })),
      certifications,
      resumes,
    };
  }

  /**
   * Update seeker profile
   */
  async updateProfile(seekerProfileId: string, data: ProfileUpdateData): Promise<unknown> {
    const oldProfile = await SeekerProfile.findById(seekerProfileId);

    const updatedProfile = await SeekerProfile.findByIdAndUpdate(
      seekerProfileId,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    // Calculate profile completion percentage
    if (updatedProfile) {
      const fields = [
        updatedProfile.first_name,
        updatedProfile.last_name,
        updatedProfile.headline,
        updatedProfile.bio,
        updatedProfile.city,
        updatedProfile.country,
      ];
      const filledFields = fields.filter(Boolean).length;
      const completionPct = Math.round((filledFields / fields.length) * 100);

      await SeekerProfile.findByIdAndUpdate(seekerProfileId, {
        $set: { profile_complete_pct: completionPct },
      });
    }

    // Profile changes affect every component of the score; flush both caches.
    // If city/state/country changed, also flush the (geo-keyed) nearby cache.
    const cityChanged =
      data.city !== undefined ||
      data.state !== undefined ||
      data.country !== undefined;
    fireAndForgetCacheInvalidation(seekerProfileId, cityChanged);

    return updatedProfile;
  }

  /**
   * Update profile visibility
   */
  async updateVisibility(seekerProfileId: string, visibility: Visibility): Promise<unknown> {
    return SeekerProfile.findByIdAndUpdate(
      seekerProfileId,
      { $set: { visibility } },
      { new: true, runValidators: true }
    ).lean();
  }

  // ============ Education ============

  async addEducation(seekerProfileId: string, data: EducationData): Promise<unknown> {
    return Education.create({
      seeker_id: seekerProfileId,
      ...data,
    });
  }

  async updateEducation(seekerProfileId: string, educationId: string, data: EducationData): Promise<unknown> {
    const education = await Education.findOneAndUpdate(
      { _id: educationId, seeker_id: seekerProfileId },
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
    return education;
  }

  async deleteEducation(seekerProfileId: string, educationId: string): Promise<boolean> {
    const result = await Education.deleteOne({ _id: educationId, seeker_id: seekerProfileId });
    return result.deletedCount > 0;
  }

  // ============ Experience ============

  async addExperience(seekerProfileId: string, data: ExperienceData): Promise<unknown> {
    const created = await WorkExperience.create({
      seeker_id: seekerProfileId,
      ...data,
    });
    fireAndForgetCacheInvalidation(seekerProfileId);
    return created;
  }

  async updateExperience(seekerProfileId: string, experienceId: string, data: ExperienceData): Promise<unknown> {
    const experience = await WorkExperience.findOneAndUpdate(
      { _id: experienceId, seeker_id: seekerProfileId },
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
    if (experience) fireAndForgetCacheInvalidation(seekerProfileId);
    return experience;
  }

  async deleteExperience(seekerProfileId: string, experienceId: string): Promise<boolean> {
    const result = await WorkExperience.deleteOne({ _id: experienceId, seeker_id: seekerProfileId });
    if (result.deletedCount > 0) fireAndForgetCacheInvalidation(seekerProfileId);
    return result.deletedCount > 0;
  }

  // ============ Skills ============

  async createOrGetSkillTag(name: string): Promise<unknown> {
    const trimmed = name.trim();
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await SkillTag.findOne({ name: { $regex: new RegExp(`^${trimmed}$`, 'i') } }).lean();
    if (existing) return existing;
    return SkillTag.create({ name: trimmed, slug, is_active: true });
  }

  async addSkills(seekerProfileId: string, skills: SkillData[]): Promise<unknown[]> {
    const skillDocs = skills.map((skill) => ({
      seeker_id: seekerProfileId,
      skill_tag_id: skill.skill_tag_id,
      proficiency: skill.proficiency,
    }));

    // Use insertMany with ordered: false to skip duplicates
    const result = await SeekerSkill.insertMany(skillDocs, { ordered: false });
    fireAndForgetCacheInvalidation(seekerProfileId);
    return result;
  }

  async removeSkill(seekerProfileId: string, skillTagId: string): Promise<boolean> {
    const result = await SeekerSkill.deleteOne({
      seeker_id: seekerProfileId,
      skill_tag_id: skillTagId,
    });
    if (result.deletedCount > 0) fireAndForgetCacheInvalidation(seekerProfileId);
    return result.deletedCount > 0;
  }

  // ============ Certifications ============

  async addCertification(seekerProfileId: string, data: CertificationData): Promise<unknown> {
    return Certification.create({
      seeker_id: seekerProfileId,
      ...data,
    });
  }

  async updateCertification(
    seekerProfileId: string,
    certificationId: string,
    data: CertificationData
  ): Promise<unknown> {
    const cert = await Certification.findOneAndUpdate(
      { _id: certificationId, seeker_id: seekerProfileId },
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
    return cert;
  }

  async deleteCertification(seekerProfileId: string, certificationId: string): Promise<boolean> {
    const result = await Certification.deleteOne({ _id: certificationId, seeker_id: seekerProfileId });
    return result.deletedCount > 0;
  }

  // ============ Resumes ============

  async addResume(seekerProfileId: string, data: ResumeData): Promise<unknown> {
    // If this is the first resume, make it default
    const existingCount = await Resume.countDocuments({ seeker_id: seekerProfileId });
    const isDefault = existingCount === 0;

    return Resume.create({
      seeker_id: seekerProfileId,
      ...data,
      is_default: isDefault,
    });
  }

  async deleteResume(seekerProfileId: string, resumeId: string): Promise<boolean> {
    const result = await Resume.deleteOne({ _id: resumeId, seeker_id: seekerProfileId });

    // If deleted resume was default, set another one as default
    if (result.deletedCount > 0) {
      const wasDefault = await Resume.findOne({ _id: resumeId });
      if (wasDefault?.is_default) {
        const nextResume = await Resume.findOne({ seeker_id: seekerProfileId });
        if (nextResume) {
          nextResume.is_default = true;
          await nextResume.save();
        }
      }
    }

    return result.deletedCount > 0;
  }

  async setDefaultResume(seekerProfileId: string, resumeId: string): Promise<unknown> {
    // Unset all defaults
    await Resume.updateMany({ seeker_id: seekerProfileId }, { $set: { is_default: false } });

    // Set new default
    return Resume.findOneAndUpdate(
      { _id: resumeId, seeker_id: seekerProfileId },
      { $set: { is_default: true } },
      { new: true }
    ).lean();
  }

  // ============ Job Search ============

  async searchJobs(filters: JobSearchFilters): Promise<{ jobs: unknown[]; pagination: unknown }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(50, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { status: 'active' };

    if (filters.q) {
      const q = filters.q.trim();
      // The job text-index only covers title/description/etc; resolve company
      // matches separately so a query like "razorpay" still finds their jobs.
      const matchedCompanies = await Company.find({
        name: { $regex: q, $options: 'i' },
      })
        .select('_id')
        .lean();
      const companyIds = matchedCompanies.map((c) => c._id);

      const or: Record<string, unknown>[] = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { responsibilities: { $regex: q, $options: 'i' } },
        { requirements: { $regex: q, $options: 'i' } },
      ];
      if (companyIds.length) {
        or.push({ company_id: { $in: companyIds } });
      }
      query.$or = or;
    }

    if (filters.city) {
      query['locations.city'] = { $regex: filters.city, $options: 'i' };
    }

    if (filters.job_type) {
      query.job_type = filters.job_type;
    }

    if (filters.work_mode) {
      query.work_mode = filters.work_mode;
    }

    if (filters.category_id) {
      query.category_id = filters.category_id;
    }

    if (filters.experience_level) {
      query.experience_level = filters.experience_level;
    }

    if (filters.salary_min !== undefined || filters.salary_max !== undefined) {
      query.$and = [];
      if (filters.salary_min !== undefined) {
        query.$and.push({ salary_max: { $gte: filters.salary_min } });
      }
      if (filters.salary_max !== undefined) {
        query.$and.push({ salary_min: { $lte: filters.salary_max } });
      }
    }

    // Geo query
    if (filters.near && filters.radius_km) {
      const [lat, lng] = filters.near.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        const geoMatch = {
          $geoNear: {
            near: { type: 'Point', coordinates: [lng, lat] },
            distanceField: 'distance',
            maxDistance: filters.radius_km * 1000,
            spherical: true,
            query,
          },
        };

        const total = await Job.aggregate([
          geoMatch as unknown as Record<string, unknown>,
          { $count: 'total' },
        ]);

        const jobs = await Job.aggregate([
          geoMatch as unknown as Record<string, unknown>,
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'companies',
              localField: 'company_id',
              foreignField: '_id',
              as: 'company',
            },
          },
          { $unwind: '$company' },
          {
            $project: {
              title: 1,
              slug: 1,
              description: 1,
              job_type: 1,
              work_mode: 1,
              experience_level: 1,
              salary_min: 1,
              salary_max: 1,
              salary_currency: 1,
              locations: 1,
              'company.name': 1,
              'company.slug': 1,
              'company.logo_url': 1,
              distance: 1,
            },
          },
        ]);

        return {
          jobs,
          pagination: {
            total: total[0]?.total || 0,
            page,
            limit,
            totalPages: Math.ceil((total[0]?.total || 0) / limit),
            hasNext: page * limit < (total[0]?.total || 0),
            hasPrev: page > 1,
          },
        };
      }
    }

    const sort: Record<string, 1 | -1> = { createdAt: -1 };

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate('company_id', 'name slug logo_url')
        .populate('category_id', 'name slug')
        .sort(sort)
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

  /**
   * Get recommended jobs based on seeker skills
   */
  async getRecommendedJobs(seekerProfileId: string, page = 1, limit = 20): Promise<{ jobs: unknown[]; pagination: unknown }> {
    // Get seeker skills
    const seekerSkills = await SeekerSkill.find({ seeker_id: seekerProfileId })
      .select('skill_tag_id')
      .lean();

    const skillTagIds = seekerSkills.map((s) => s.skill_tag_id);

    // Find jobs with matching skills, prioritized by skill overlap
    const skip = (page - 1) * limit;

    const matchingJobs = await Job.aggregate([
      { $match: { status: 'active' } },
      {
        $lookup: {
          from: 'jobskills',
          localField: '_id',
          foreignField: 'job_id',
          as: 'jobSkills',
        },
      },
      {
        $addFields: {
          matchCount: {
            $size: {
              $setIntersection: [
                '$jobSkills.skill_tag_id',
                skillTagIds.map((id) => id),
              ],
            },
          },
        },
      },
      { $match: { matchCount: { $gt: 0 } } },
      { $sort: { matchCount: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'companies',
          localField: 'company_id',
          foreignField: '_id',
          as: 'company',
        },
      },
      { $unwind: '$company' },
      {
        $project: {
          title: 1,
          slug: 1,
          description: 1,
          job_type: 1,
          work_mode: 1,
          experience_level: 1,
          salary_min: 1,
          salary_max: 1,
          salary_currency: 1,
          locations: 1,
          'company.name': 1,
          'company.slug': 1,
          'company.logo_url': 1,
          matchCount: 1,
        },
      },
    ]);

    // Get total count for pagination
    const totalResult = await Job.aggregate([
      { $match: { status: 'active' } },
      {
        $lookup: {
          from: 'jobskills',
          localField: '_id',
          foreignField: 'job_id',
          as: 'jobSkills',
        },
      },
      {
        $addFields: {
          matchCount: {
            $size: {
              $setIntersection: [
                '$jobSkills.skill_tag_id',
                skillTagIds.map((id) => id),
              ],
            },
          },
        },
      },
      { $match: { matchCount: { $gt: 0 } } },
      { $count: 'total' },
    ]);

    const total = totalResult[0]?.total || 0;

    return {
      jobs: matchingJobs,
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

  async getJobById(jobId: string): Promise<unknown> {
    const job = await Job.findById(jobId)
      .populate('company_id', 'name slug logo_url description industry website_url')
      .populate('category_id', 'name slug icon_url')
      .populate('locations.branch_id', 'name city state country address')
      .lean();

    if (!job) return null;

    // Populate skills via JobSkill join
    const jobSkills = await JobSkill.find({ job_id: job._id })
      .populate('skill_tag_id', 'name')
      .lean();

    const skills = jobSkills.map((js: any) => ({
      name: js.skill_tag_id?.name ?? '',
      is_required: js.is_required ?? true,
    }));

    return { ...job, skills };
  }

  // ============ Saved Jobs ============

  async saveJob(seekerProfileId: string, jobId: string): Promise<unknown> {
    const result = await SavedJob.findOneAndUpdate(
      { seeker_id: seekerProfileId, job_id: jobId },
      { seeker_id: seekerProfileId, job_id: jobId },
      { upsert: true, new: true }
    ).lean();
    fireAndForgetCacheInvalidation(seekerProfileId);
    return result;
  }

  async unsaveJob(seekerProfileId: string, jobId: string): Promise<boolean> {
    const result = await SavedJob.deleteOne({ seeker_id: seekerProfileId, job_id: jobId });
    return result.deletedCount > 0;
  }

  async getSavedJobs(seekerProfileId: string, page = 1, limit = 20): Promise<{ jobs: unknown[]; pagination: unknown }> {
    const skip = (page - 1) * limit;

    const [savedJobs, total] = await Promise.all([
      SavedJob.find({ seeker_id: seekerProfileId })
        .populate({
          path: 'job_id',
          populate: [
            { path: 'company_id', select: 'name slug logo_url' },
            { path: 'category_id', select: 'name slug' },
          ],
        })
        .sort({ saved_at: -1 })
        .skip(skip)
        . limit(limit)
        .lean(),
      SavedJob.countDocuments({ seeker_id: seekerProfileId }),
    ]);

    return {
      jobs: savedJobs.map((sj) => sj.job_id),
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

  // ============ Applications ============

  async createApplication(
    seekerProfileId: string,
    jobId: string,
    resumeId: string,
    coverLetterText?: string,
    userId?: string,
    userRole?: string
  ): Promise<unknown> {
    // Check if already applied
    const existing = await Application.findOne({ job_id: jobId, seeker_id: seekerProfileId });
    if (existing) {
      throw new Error('Already applied to this job');
    }

    // Check if job is active
    const job = await Job.findById(jobId);
    if (!job || job.status !== 'active') {
      throw new Error('Job is not available for applications');
    }

    // Check deadline
    if (job.application_deadline && new Date(job.application_deadline) < new Date()) {
      throw new Error('Application deadline has passed');
    }

    // Verify resume belongs to seeker
    const resume = await Resume.findOne({ _id: resumeId, seeker_id: seekerProfileId });
    if (!resume) {
      throw new Error('Resume not found');
    }

    const application = await Application.create({
      job_id: jobId,
      seeker_id: seekerProfileId,
      resume_id: resumeId,
      cover_letter_text: coverLetterText,
      status: 'applied',
    });

    // Create audit log
    if (userId && userRole) {
      await this.createAuditLog(
        userId,
        userRole,
        'application.created',
        'Application',
        application._id.toString(),
        undefined,
        { status: 'applied', job_id: jobId }
      );
    }

    // Publish event to BullMQ
    await eventQueue.add('application.status.changed', {
      applicationId: application._id.toString(),
      jobId: jobId,
      seekerId: seekerProfileId,
      oldStatus: undefined,
      newStatus: 'applied',
    });

    // Drop reco cache so the just-applied job stops appearing in recommendations.
    fireAndForgetCacheInvalidation(seekerProfileId);

    // Mark any pending company invite for this (seeker, job) as converted.
    void insightsService.markAppliedFromApplication({
      seekerId: seekerProfileId,
      jobId: jobId,
      applicationId: application._id.toString(),
    });

    return application;
  }

  async getApplications(
    seekerProfileId: string,
    filters: { status?: ApplicationStatus; page?: number; limit?: number }
  ): Promise<{ applications: unknown[]; pagination: unknown }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { seeker_id: seekerProfileId };
    if (filters.status) {
      query.status = filters.status;
    }

    const [applications, total] = await Promise.all([
      Application.find(query)
        .populate('job_id', 'title slug locations salary_min salary_max salary_currency work_mode job_type')
        .sort({ applied_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Application.countDocuments(query),
    ]);

    return {
      applications,
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

  async getApplicationById(seekerProfileId: string, applicationId: string): Promise<unknown> {
    return Application.findOne({ _id: applicationId, seeker_id: seekerProfileId })
      .populate('job_id')
      .populate('resume_id')
      .lean();
  }

  async deleteApplication(seekerProfileId: string, applicationId: string, userId?: string): Promise<boolean> {
    const application = await Application.findOne({ _id: applicationId, seeker_id: seekerProfileId });

    if (!application) return false;

    // Only allow withdrawal before shortlisted
    if (application.status === 'shortlisted' || application.status === 'interview_scheduled') {
      throw new Error('Cannot withdraw application at this stage');
    }

    const oldStatus = application.status;
    application.status = 'withdrawn';
    await application.save();

    // Create audit log
    if (userId) {
      await this.createAuditLog(
        userId,
        'job_seeker',
        'application.withdrawn',
        'Application',
        applicationId,
        { status: oldStatus },
        { status: 'withdrawn' }
      );
    }

    // Publish event
    await eventQueue.add('application.status.changed', {
      applicationId,
      seekerId: seekerProfileId,
      oldStatus,
      newStatus: 'withdrawn',
    });

    return true;
  }

  // ============ Notifications ============

  async getNotifications(userId: string, page = 1, limit = 20): Promise<{ notifications: unknown[]; pagination: unknown }> {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({ user_id: userId })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ user_id: userId }),
    ]);

    return {
      notifications,
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

  async markNotificationRead(userId: string, notificationId: string): Promise<unknown> {
    return Notification.findOneAndUpdate(
      { _id: notificationId, user_id: userId },
      { $set: { is_read: true } },
      { new: true }
    ).lean();
  }

  async markAllNotificationsRead(userId: string): Promise<unknown> {
    return Notification.updateMany({ user_id: userId }, { $set: { is_read: true } });
  }

  // ============ Helpers ============

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
}

export const seekerService = new SeekerService();
export default seekerService;
