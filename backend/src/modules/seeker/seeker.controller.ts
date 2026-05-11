import { Response } from 'express';
import { seekerService } from './seeker.service.js';
import { AuthenticatedRequest } from '../../middleware/authenticate.js';
import { User } from '../../models/User.js';
import { SeekerProfile } from '../../models/SeekerProfile.js';
import { recordJobView, buildViewerKey } from '../shared/jobView.service.js';

/**
 * Resolve the SeekerProfile id for the authenticated user.
 *
 * Old access tokens (issued before we started embedding `seeker_profile_id`
 * in the JWT) and seeker accounts created before the signup flow created a
 * SeekerProfile both end up here without an id on the request. Rather than
 * forcing every existing seeker to re-register, we fall back to a User
 * lookup and lazily create a profile if one is missing. The next access
 * token they receive (after refresh) will carry the id directly.
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
  user.seeker_profile_id = profile._id as import('mongoose').Types.ObjectId;
  await user.save();
  if (req.user) req.user.seeker_profile_id = profile._id.toString();
  return profile._id.toString();
}
import {
  updateProfileSchema,
  updateVisibilitySchema,
  createEducationSchema,
  updateEducationSchema,
  deleteEducationSchema,
  createExperienceSchema,
  updateExperienceSchema,
  deleteExperienceSchema,
  addSkillsSchema,
  removeSkillSchema,
  createCertificationSchema,
  updateCertificationSchema,
  deleteCertificationSchema,
  uploadResumeSchema,
  deleteResumeSchema,
  setDefaultResumeSchema,
  searchJobsSchema,
  getApplicationsSchema,
  getApplicationByIdSchema,
  createApplicationSchema,
  deleteApplicationSchema,
  markNotificationReadSchema,
  getJobByIdSchema,
  saveJobSchema,
} from './seeker.schema.js';

export class SeekerController {
  /**
   * GET /api/v1/seeker/profile
   * Get own profile with all related data
   */
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const profile = await seekerService.getProfile(seekerProfileId.toString());
      if (!profile) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Profile not found',
        });
        return;
      }

      res.json({
        status: 'success',
        data: profile,
      });
    } catch (error) {
      console.error('Error getting profile:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get profile',
      });
    }
  }

  /**
   * PUT /api/v1/seeker/profile
   * Update own profile
   */
  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const allowed = [
        'first_name', 'last_name', 'phone', 'date_of_birth',
        'city', 'state', 'country', 'headline', 'bio', 'avatar_url',
        'linkedin_url', 'github_url', 'portfolio_url',
      ] as const;
      const payload: Record<string, unknown> = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) payload[key] = req.body[key];
      }
      // The frontend sends a single `location` field — map it onto `city`
      // unless the caller already supplied an explicit city.
      if (req.body.location !== undefined && payload.city === undefined) {
        payload.city = req.body.location;
      }

      const updatedProfile = await seekerService.updateProfile(seekerProfileId.toString(), payload);

      res.json({
        status: 'success',
        data: updatedProfile,
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to update profile',
      });
    }
  }

  /**
   * PUT /api/v1/seeker/profile/visibility
   * Update profile visibility
   */
  async updateVisibility(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const { visibility } = req.body;
      const updatedProfile = await seekerService.updateVisibility(seekerProfileId.toString(), visibility);

      res.json({
        status: 'success',
        data: updatedProfile,
      });
    } catch (error) {
      console.error('Error updating visibility:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to update visibility',
      });
    }
  }

  // ============ Education ============

  /**
   * POST /api/v1/seeker/profile/education
   */
  async addEducation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const education = await seekerService.addEducation(seekerProfileId.toString(), req.body);

      res.status(201).json({
        status: 'success',
        data: education,
      });
    } catch (error) {
      console.error('Error adding education:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to add education',
      });
    }
  }

  /**
   * PUT /api/v1/seeker/profile/education/:id
   */
  async updateEducation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const { id } = req.params;
      const education = await seekerService.updateEducation(seekerProfileId.toString(), id, req.body);

      if (!education) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Education not found',
        });
        return;
      }

      res.json({
        status: 'success',
        data: education,
      });
    } catch (error) {
      console.error('Error updating education:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to update education',
      });
    }
  }

  /**
   * DELETE /api/v1/seeker/profile/education/:id
   */
  async deleteEducation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const { id } = req.params;
      const deleted = await seekerService.deleteEducation(seekerProfileId.toString(), id);

      if (!deleted) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Education not found',
        });
        return;
      }

      res.json({
        status: 'success',
        message: 'Education deleted',
      });
    } catch (error) {
      console.error('Error deleting education:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete education',
      });
    }
  }

  // ============ Experience ============

  /**
   * POST /api/v1/seeker/profile/experience
   */
  async addExperience(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const experience = await seekerService.addExperience(seekerProfileId.toString(), req.body);

      res.status(201).json({
        status: 'success',
        data: experience,
      });
    } catch (error) {
      console.error('Error adding experience:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to add experience',
      });
    }
  }

  /**
   * PUT /api/v1/seeker/profile/experience/:id
   */
  async updateExperience(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const { id } = req.params;
      const experience = await seekerService.updateExperience(seekerProfileId.toString(), id, req.body);

      if (!experience) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Experience not found',
        });
        return;
      }

      res.json({
        status: 'success',
        data: experience,
      });
    } catch (error) {
      console.error('Error updating experience:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to update experience',
      });
    }
  }

  /**
   * DELETE /api/v1/seeker/profile/experience/:id
   */
  async deleteExperience(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const { id } = req.params;
      const deleted = await seekerService.deleteExperience(seekerProfileId.toString(), id);

      if (!deleted) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Experience not found',
        });
        return;
      }

      res.json({
        status: 'success',
        message: 'Experience deleted',
      });
    } catch (error) {
      console.error('Error deleting experience:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete experience',
      });
    }
  }

  // ============ Skills ============

  /**
   * POST /api/v1/seeker/profile/skills
   */
  async addSkills(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      // Frontend may send either:
      //   { skill_tag_ids: ["id1", "id2"] }    – simple add, default proficiency
      //   { skills: [{ skill_tag_id, proficiency }] } – full payload
      const body = req.body as {
        skill_tag_ids?: string[];
        skills?: { skill_tag_id: string; proficiency?: 'beginner' | 'intermediate' | 'expert' }[];
      };
      let skillsPayload: { skill_tag_id: string; proficiency: 'beginner' | 'intermediate' | 'expert' }[] = [];
      if (Array.isArray(body.skill_tag_ids)) {
        skillsPayload = body.skill_tag_ids
          .filter((id) => typeof id === 'string' && id.trim())
          .map((id) => ({ skill_tag_id: id, proficiency: 'intermediate' as const }));
      } else if (Array.isArray(body.skills)) {
        skillsPayload = body.skills.map((s) => ({
          skill_tag_id: s.skill_tag_id,
          proficiency: s.proficiency ?? 'intermediate',
        }));
      }

      if (skillsPayload.length === 0) {
        res.status(400).json({ status: 'error', code: 'VALIDATION_ERROR', message: 'No skills provided' });
        return;
      }

      const addedSkills = await seekerService.addSkills(seekerProfileId.toString(), skillsPayload);

      res.status(201).json({
        status: 'success',
        data: addedSkills,
      });
    } catch (error) {
      console.error('Error adding skills:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to add skills',
      });
    }
  }

  /**
   * DELETE /api/v1/seeker/profile/skills/:skillTagId
   */
  async removeSkill(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const { skillTagId } = req.params;
      const deleted = await seekerService.removeSkill(seekerProfileId.toString(), skillTagId);

      if (!deleted) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Skill not found',
        });
        return;
      }

      res.json({
        status: 'success',
        message: 'Skill removed',
      });
    } catch (error) {
      console.error('Error removing skill:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to remove skill',
      });
    }
  }

  // ============ Certifications ============

  /**
   * POST /api/v1/seeker/profile/certifications
   */
  async addCertification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const certification = await seekerService.addCertification(seekerProfileId.toString(), req.body);

      res.status(201).json({
        status: 'success',
        data: certification,
      });
    } catch (error) {
      console.error('Error adding certification:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to add certification',
      });
    }
  }

  /**
   * PUT /api/v1/seeker/profile/certifications/:id
   */
  async updateCertification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const { id } = req.params;
      const certification = await seekerService.updateCertification(seekerProfileId.toString(), id, req.body);

      if (!certification) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Certification not found',
        });
        return;
      }

      res.json({
        status: 'success',
        data: certification,
      });
    } catch (error) {
      console.error('Error updating certification:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to update certification',
      });
    }
  }

  /**
   * DELETE /api/v1/seeker/profile/certifications/:id
   */
  async deleteCertification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const { id } = req.params;
      const deleted = await seekerService.deleteCertification(seekerProfileId.toString(), id);

      if (!deleted) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Certification not found',
        });
        return;
      }

      res.json({
        status: 'success',
        message: 'Certification deleted',
      });
    } catch (error) {
      console.error('Error deleting certification:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete certification',
      });
    }
  }

  // ============ Resumes ============

  /**
   * POST /api/v1/seeker/profile/resumes
   */
  async uploadResume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const file = (req as unknown as { file?: Express.Multer.File }).file;
      if (!file) {
        res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'No resume file uploaded',
        });
        return;
      }

      const resume = await seekerService.addResume(seekerProfileId.toString(), {
        file_url: `/uploads/resumes/${file.filename}`,
        original_name: file.originalname,
        file_size_kb: Math.round(file.size / 1024),
        label: typeof req.body?.label === 'string' ? req.body.label : undefined,
      });

      res.status(201).json({
        status: 'success',
        data: resume,
      });
    } catch (error) {
      console.error('Error uploading resume:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to upload resume',
      });
    }
  }

  /**
   * POST /api/v1/seeker/profile/avatar
   */
  async uploadAvatar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({ status: 'error', code: 'FORBIDDEN', message: 'No seeker profile associated with this user' });
        return;
      }

      const file = (req as unknown as { file?: Express.Multer.File }).file;
      if (!file) {
        res.status(400).json({ status: 'error', code: 'VALIDATION_ERROR', message: 'No image uploaded' });
        return;
      }

      const avatarUrl = `/uploads/avatars/${file.filename}`;
      const updated = await seekerService.updateProfile(seekerProfileId.toString(), { avatar_url: avatarUrl });

      res.status(201).json({ status: 'success', data: { avatar_url: avatarUrl, profile: updated } });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      res.status(500).json({ status: 'error', code: 'INTERNAL_ERROR', message: 'Failed to upload avatar' });
    }
  }

  /**
   * DELETE /api/v1/seeker/profile/avatar
   */
  async removeAvatar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({ status: 'error', code: 'FORBIDDEN', message: 'No seeker profile associated with this user' });
        return;
      }

      await seekerService.updateProfile(seekerProfileId.toString(), { avatar_url: '' });
      res.json({ status: 'success', message: 'Avatar removed' });
    } catch (error) {
      console.error('Error removing avatar:', error);
      res.status(500).json({ status: 'error', code: 'INTERNAL_ERROR', message: 'Failed to remove avatar' });
    }
  }

  /**
   * DELETE /api/v1/seeker/profile/resumes/:id
   */
  async deleteResume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const { id } = req.params;
      const deleted = await seekerService.deleteResume(seekerProfileId.toString(), id);

      if (!deleted) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Resume not found',
        });
        return;
      }

      res.json({
        status: 'success',
        message: 'Resume deleted',
      });
    } catch (error) {
      console.error('Error deleting resume:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete resume',
      });
    }
  }

  /**
   * PUT /api/v1/seeker/profile/resumes/:id/default
   */
  async setDefaultResume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const { id } = req.params;
      const resume = await seekerService.setDefaultResume(seekerProfileId.toString(), id);

      if (!resume) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Resume not found',
        });
        return;
      }

      res.json({
        status: 'success',
        data: resume,
      });
    } catch (error) {
      console.error('Error setting default resume:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to set default resume',
      });
    }
  }

  // ============ Jobs ============

  /**
   * GET /api/v1/seeker/jobs
   * Search jobs with filters
   */
  async searchJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await seekerService.searchJobs(req.query as Record<string, unknown>);

      res.json({
        status: 'success',
        data: result.jobs,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error searching jobs:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to search jobs',
      });
    }
  }

  /**
   * GET /api/v1/seeker/jobs/recommended
   * Get recommended jobs based on seeker skills
   */
  async getRecommendedJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await seekerService.getRecommendedJobs(seekerProfileId.toString(), page, limit);

      res.json({
        status: 'success',
        data: result.jobs,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting recommended jobs:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get recommended jobs',
      });
    }
  }

  /**
   * GET /api/v1/seeker/jobs/:jobId
   */
  async getJobById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const job = await seekerService.getJobById(jobId);

      if (!job) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Job not found',
        });
        return;
      }

      const seekerProfileId = await resolveSeekerProfileId(req);
      const viewer = buildViewerKey({
        seekerId: seekerProfileId,
        ip: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
      });
      void recordJobView({
        jobId,
        viewerKey: viewer.key,
        viewerType: viewer.type,
        source: 'seeker',
      });

      res.json({
        status: 'success',
        data: job,
      });
    } catch (error) {
      console.error('Error getting job:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get job',
      });
    }
  }

  /**
   * POST /api/v1/seeker/jobs/:jobId/save
   */
  async saveJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const { jobId } = req.params;
      const savedJob = await seekerService.saveJob(seekerProfileId.toString(), jobId);

      res.status(201).json({
        status: 'success',
        data: savedJob,
      });
    } catch (error) {
      console.error('Error saving job:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to save job',
      });
    }
  }

  /**
   * DELETE /api/v1/seeker/jobs/:jobId/save
   */
  async unsaveJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const { jobId } = req.params;
      await seekerService.unsaveJob(seekerProfileId.toString(), jobId);

      res.json({
        status: 'success',
        message: 'Job unsaved',
      });
    } catch (error) {
      console.error('Error unsaving job:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to unsave job',
      });
    }
  }

  /**
   * GET /api/v1/seeker/jobs/saved
   */
  async getSavedJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await seekerService.getSavedJobs(seekerProfileId.toString(), page, limit);

      res.json({
        status: 'success',
        data: result.jobs,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting saved jobs:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get saved jobs',
      });
    }
  }

  // ============ Applications ============

  /**
   * POST /api/v1/seeker/applications
   */
  async createApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const { jobId } = req.params;
      const { resume_id, cover_letter_text } = req.body;

      const application = await seekerService.createApplication(
        seekerProfileId.toString(),
        jobId,
        resume_id,
        cover_letter_text,
        req.user?.sub,
        req.user?.role
      );

      res.status(201).json({
        status: 'success',
        data: application,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create application';
      console.error('Error creating application:', error);
      res.status(400).json({
        status: 'error',
        code: 'APPLICATION_ERROR',
        message,
      });
    }
  }

  /**
   * GET /api/v1/seeker/applications
   */
  async getApplications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;

      const result = await seekerService.getApplications(seekerProfileId.toString(), { status, page, limit });

      res.json({
        status: 'success',
        data: result.applications,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting applications:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get applications',
      });
    }
  }

  /**
   * GET /api/v1/seeker/applications/:id
   */
  async getApplicationById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const { id } = req.params;
      const application = await seekerService.getApplicationById(seekerProfileId.toString(), id);

      if (!application) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Application not found',
        });
        return;
      }

      res.json({
        status: 'success',
        data: application,
      });
    } catch (error) {
      console.error('Error getting application:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get application',
      });
    }
  }

  /**
   * DELETE /api/v1/seeker/applications/:id
   * Withdraw application (only before shortlisted)
   */
  async deleteApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seekerProfileId = await resolveSeekerProfileId(req);
      if (!seekerProfileId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No seeker profile associated with this user',
        });
        return;
      }

      const { id } = req.params;
      await seekerService.deleteApplication(seekerProfileId.toString(), id, req.user?.sub);

      res.json({
        status: 'success',
        message: 'Application withdrawn',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to withdraw application';
      console.error('Error withdrawing application:', error);
      res.status(400).json({
        status: 'error',
        code: 'APPLICATION_ERROR',
        message,
      });
    }
  }

  // ============ Notifications ============

  /**
   * GET /api/v1/seeker/notifications
   */
  async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(401).json({
          status: 'error',
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await seekerService.getNotifications(userId, page, limit);

      res.json({
        status: 'success',
        data: result.notifications,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get notifications',
      });
    }
  }

  /**
   * PUT /api/v1/seeker/notifications/:id/read
   */
  async markNotificationRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(401).json({
          status: 'error',
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;
      const notification = await seekerService.markNotificationRead(userId, id);

      if (!notification) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Notification not found',
        });
        return;
      }

      res.json({
        status: 'success',
        data: notification,
      });
    } catch (error) {
      console.error('Error marking notification read:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to mark notification read',
      });
    }
  }

  /**
   * PUT /api/v1/seeker/notifications/read-all
   */
  async markAllNotificationsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(401).json({
          status: 'error',
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
        return;
      }

      await seekerService.markAllNotificationsRead(userId);

      res.json({
        status: 'success',
        message: 'All notifications marked as read',
      });
    } catch (error) {
      console.error('Error marking all notifications read:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to mark all notifications as read',
      });
    }
  }

  async createSkillTag(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ status: 'error', code: 'VALIDATION_ERROR', message: 'name is required' });
        return;
      }
      const tag = await seekerService.createOrGetSkillTag(name);
      res.status(201).json({ status: 'success', data: tag });
    } catch (error) {
      console.error('Error creating skill tag:', error);
      res.status(500).json({ status: 'error', code: 'INTERNAL_ERROR', message: 'Failed to create skill tag' });
    }
  }
}

export const seekerController = new SeekerController();
export default seekerController;
