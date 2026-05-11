import { Response } from 'express';
import { companyService } from './company.service.js';
import { AuthenticatedRequest } from '../../middleware/authenticate.js';
import { Application } from '../../models/Application.js';
import type { ApplicationStatus } from '../../types/index.js';
import { recordJobView, buildViewerKey } from '../shared/jobView.service.js';

export class CompanyController {
  // ============ Profile ============

  /**
   * GET /api/v1/company/profile
   */
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const profile = await companyService.getProfile(companyId.toString());

      if (!profile) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Company not found',
        });
        return;
      }

      res.json({
        status: 'success',
        data: profile,
      });
    } catch (error) {
      console.error('Error getting company profile:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get company profile',
      });
    }
  }

  /**
   * PUT /api/v1/company/profile
   */
  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const userId = req.user?.sub;
      const role = req.user?.role;
      if (!companyId || !userId || !role) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const updatedProfile = await companyService.updateProfile(
        companyId.toString(),
        req.body,
        { userId, role }
      );

      res.json({
        status: 'success',
        data: updatedProfile,
      });
    } catch (error) {
      console.error('Error updating company profile:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to update company profile',
      });
    }
  }

  /**
   * POST /api/v1/company/profile/logo
   */
  async uploadLogo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const userId = req.user?.sub;
      const role = req.user?.role;
      if (!companyId || !userId || !role) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const { logo_url } = req.body;
      const updatedProfile = await companyService.updateLogo(
        companyId.toString(),
        logo_url,
        { userId, role }
      );

      res.json({
        status: 'success',
        data: updatedProfile,
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to upload logo',
      });
    }
  }

  // ============ Branches ============

  /**
   * GET /api/v1/company/branches
   */
  async getBranches(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const branches = await companyService.getBranches(companyId.toString());

      res.json({
        status: 'success',
        data: branches,
      });
    } catch (error) {
      console.error('Error getting branches:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get branches',
      });
    }
  }

  /**
   * POST /api/v1/company/branches
   */
  async createBranch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const branch = await companyService.createBranch(
        companyId.toString(),
        req.body,
        req.user?.sub || ''
      );

      res.status(201).json({
        status: 'success',
        data: branch,
      });
    } catch (error) {
      console.error('Error creating branch:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to create branch',
      });
    }
  }

  /**
   * PUT /api/v1/company/branches/:id
   */
  async updateBranch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const { id } = req.params;
      const branch = await companyService.updateBranch(
        companyId.toString(),
        id,
        req.body,
        req.user?.sub || ''
      );

      if (!branch) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Branch not found',
        });
        return;
      }

      res.json({
        status: 'success',
        data: branch,
      });
    } catch (error) {
      console.error('Error updating branch:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to update branch',
      });
    }
  }

  /**
   * DELETE /api/v1/company/branches/:id
   */
  async deleteBranch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const { id } = req.params;
      await companyService.deleteBranch(companyId.toString(), id, req.user?.sub || '');

      res.json({
        status: 'success',
        message: 'Branch deleted',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete branch';
      console.error('Error deleting branch:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  // ============ Team ============

  /**
   * GET /api/v1/company/team
   */
  async getTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const team = await companyService.getTeam(companyId.toString());

      res.json({
        status: 'success',
        data: team,
      });
    } catch (error) {
      console.error('Error getting team:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get team',
      });
    }
  }

  /**
   * POST /api/v1/company/team/invite
   */
  async inviteTeamMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const { email, role, branch_id } = req.body;

      const company = await (await import('../../models/index.js')).Company.findById(companyId).lean() as { name?: string } | null;
      const companyName = company?.name || 'Your Company';
      const inviterName = req.user?.email || 'Company Admin';

      const member = await companyService.inviteTeamMember(
        companyId.toString(),
        email,
        role,
        inviterName,
        companyName,
        branch_id
      );

      res.status(201).json({
        status: 'success',
        data: member,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to invite team member';
      console.error('Error inviting team member:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * PUT /api/v1/company/team/:memberId/role
   */
  async updateMemberRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const { memberId } = req.params;
      const { role, branch_id } = req.body;

      const member = await companyService.updateMemberRole(
        companyId.toString(),
        memberId,
        role,
        branch_id,
        req.user?.sub
      );

      res.json({
        status: 'success',
        data: member,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update member role';
      console.error('Error updating member role:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * DELETE /api/v1/company/team/:memberId
   */
  async removeTeamMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const { memberId } = req.params;
      await companyService.removeTeamMember(companyId.toString(), memberId, req.user?.sub || '');

      res.json({
        status: 'success',
        message: 'Team member removed',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove team member';
      console.error('Error removing team member:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * GET /api/v1/company/team/audit-log
   */
  async getTeamAuditLog(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await companyService.getTeamAuditLog(companyId.toString(), page, limit);

      res.json({
        status: 'success',
        data: result.logs,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting team audit log:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get team audit log',
      });
    }
  }

  // ============ Jobs ============

  /**
   * GET /api/v1/company/jobs
   */
  async getJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;

      const result = await companyService.getJobs(companyId.toString(), { status, page, limit });

      res.json({
        status: 'success',
        data: result.jobs,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting jobs:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get jobs',
      });
    }
  }

  /**
   * POST /api/v1/company/jobs/ai-generate
   */
  async generateJobWithAI(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { title, job_type, work_mode, experience_level, experience_min_years, experience_max_years } = req.body;
      if (!title || !job_type || !work_mode) {
        res.status(400).json({ status: 'error', code: 'VALIDATION_ERROR', message: 'title, job_type and work_mode are required' });
        return;
      }
      const result = await companyService.generateJobWithAI({ title, job_type, work_mode, experience_level, experience_min_years, experience_max_years });
      res.json({ status: 'success', data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI generation failed';
      console.error('Error generating job with AI:', error);
      res.status(500).json({ status: 'error', code: 'AI_ERROR', message });
    }
  }

  /**
   * POST /api/v1/company/jobs
   */
  async createJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const userId = req.user?.sub;
      if (!companyId || !userId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const userRole = req.user?.role ?? 'company_owner';
      const job = await companyService.createJob(
        companyId.toString(),
        userId,
        req.body,
        userId,
        userRole
      );

      res.status(201).json({
        status: 'success',
        data: job,
      });
    } catch (error) {
      console.error('Error creating job:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to create job',
      });
    }
  }

  /**
   * GET /api/v1/company/jobs/:jobId
   */
  async getJobById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const { jobId } = req.params;
      const job = await companyService.getJobById(companyId.toString(), jobId);

      if (!job) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Job not found',
        });
        return;
      }

      const viewer = buildViewerKey({
        userId: req.user?.sub ?? null,
        ip: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
      });
      void recordJobView({
        jobId,
        viewerKey: viewer.key,
        viewerType: viewer.type,
        source: 'company',
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
   * PUT /api/v1/company/jobs/:jobId
   */
  async updateJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const userId = req.user?.sub;
      if (!companyId || !userId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const userRole = req.user?.role ?? 'company_owner';
      const { jobId } = req.params;
      const job = await companyService.updateJob(companyId.toString(), jobId, req.body, userId, userRole);

      if (!job) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Job not found',
        });
        return;
      }

      res.json({
        status: 'success',
        data: job,
      });
    } catch (error) {
      console.error('Error updating job:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to update job',
      });
    }
  }

  /**
   * DELETE /api/v1/company/jobs/:jobId
   */
  async deleteJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const userId = req.user?.sub;
      if (!companyId || !userId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const userRole = req.user?.role ?? 'company_owner';
      const { jobId } = req.params;
      await companyService.deleteJob(companyId.toString(), jobId, userId, userRole);

      res.json({
        status: 'success',
        message: 'Job deleted',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete job';
      console.error('Error deleting job:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * POST /api/v1/company/jobs/:jobId/publish
   */
  async publishJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const userId = req.user?.sub;
      if (!companyId || !userId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const userRole = req.user?.role ?? 'company_owner';
      const { jobId } = req.params;
      const job = await companyService.publishJob(companyId.toString(), jobId, userId, userRole);

      res.json({
        status: 'success',
        data: job,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish job';
      console.error('Error publishing job:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * POST /api/v1/company/jobs/:jobId/close
   */
  async closeJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const userId = req.user?.sub;
      if (!companyId || !userId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const userRole = req.user?.role ?? 'company_owner';
      const { jobId } = req.params;
      const job = await companyService.closeJob(companyId.toString(), jobId, userId, userRole);

      res.json({
        status: 'success',
        data: job,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to close job';
      console.error('Error closing job:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * POST /api/v1/company/jobs/:jobId/duplicate
   */
  async duplicateJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const userId = req.user?.sub;
      if (!companyId || !userId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const userRole = req.user?.role ?? 'company_owner';
      const { jobId } = req.params;
      const job = await companyService.duplicateJob(companyId.toString(), jobId, userId, userRole);

      res.status(201).json({
        status: 'success',
        data: job,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to duplicate job';
      console.error('Error duplicating job:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  // ============ Applicants ============

  /**
   * GET /api/v1/company/jobs/:jobId/applicants
   */
  async getApplicants(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const { jobId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;

      const result = await companyService.getApplicants(
        companyId.toString(),
        jobId,
        { status, page, limit }
      );

      res.json({
        status: 'success',
        data: result.applications,
        pagination: result.pagination,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get applicants';
      console.error('Error getting applicants:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * GET /api/v1/company/jobs/:jobId/applicants/:applicationId
   */
  async getApplicantDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const { jobId, applicationId } = req.params;
      const application = await companyService.getApplicantDetail(
        companyId.toString(),
        jobId,
        applicationId
      );

      res.json({
        status: 'success',
        data: application,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get applicant';
      console.error('Error getting applicant:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * PUT /api/v1/company/jobs/:jobId/applicants/:applicationId/status
   */
  async updateApplicationStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const userId = req.user?.sub;
      const userRole = req.user?.role;
      if (!companyId || !userId || !userRole) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const { jobId, applicationId } = req.params;
      const { status, note } = req.body;

      const application = await companyService.updateApplicationStatus(
        companyId.toString(),
        jobId,
        applicationId,
        status,
        userId,
        userRole,
        note
      );

      res.json({
        status: 'success',
        data: application,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update status';
      console.error('Error updating application status:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * POST /api/v1/company/jobs/:jobId/applicants/:applicationId/notes
   */
  async addApplicantNote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const userId = req.user?.sub;
      if (!companyId || !userId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const { jobId, applicationId } = req.params;
      const { note } = req.body;

      const noteResult = await companyService.addApplicantNote(
        companyId.toString(),
        jobId,
        applicationId,
        userId,
        note
      );

      res.status(201).json({
        status: 'success',
        data: noteResult,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add note';
      console.error('Error adding applicant note:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * GET /api/v1/company/jobs/:jobId/applicants/:applicationId/notes
   */
  async getApplicantNotes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const { jobId, applicationId } = req.params;
      const notes = await companyService.getApplicantNotes(
        companyId.toString(),
        jobId,
        applicationId
      );

      res.json({
        status: 'success',
        data: notes,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get notes';
      console.error('Error getting applicant notes:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * POST /api/v1/company/jobs/:jobId/applicants/:applicationId/interview
   */
  async scheduleInterview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const userId = req.user?.sub;
      if (!companyId || !userId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const { jobId, applicationId } = req.params;
      const userRole = req.user?.role ?? 'company_owner';

      const interview = await companyService.scheduleInterview(
        companyId.toString(),
        jobId,
        applicationId,
        userId,
        req.body,
        userRole
      );

      res.status(201).json({
        status: 'success',
        data: interview,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to schedule interview';
      console.error('Error scheduling interview:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * PUT /api/v1/company/interviews/:interviewId
   */
  async updateInterview(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const { interviewId } = req.params;
      const interview = await companyService.updateInterview(interviewId, req.body, userId);

      res.json({
        status: 'success',
        data: interview,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update interview';
      console.error('Error updating interview:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * GET /api/v1/company/jobs/:jobId/applicants/:applicationId/resume
   */
  async getApplicantResume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const { jobId, applicationId } = req.params;
      const resume = await companyService.getApplicantResume(
        companyId.toString(),
        jobId,
        applicationId
      );

      res.json({
        status: 'success',
        data: resume,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get resume';
      console.error('Error getting applicant resume:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  // ============ Dashboard ============

  /**
   * GET /api/v1/company/dashboard/stats
   */
  async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const period = (req.query.period as string) || '30d';
      const stats = await companyService.getDashboardStats(companyId.toString(), period);

      res.json({
        status: 'success',
        data: stats,
      });
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get dashboard stats',
      });
    }
  }

  /**
   * GET /api/v1/company/dashboard/pipeline
   */
  async getDashboardPipeline(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const pipeline = await companyService.getDashboardPipeline(companyId.toString());

      res.json({
        status: 'success',
        data: pipeline,
      });
    } catch (error) {
      console.error('Error getting dashboard pipeline:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get dashboard pipeline',
      });
    }
  }

  /**
   * GET /api/v1/company/dashboard/top-jobs
   */
  async getTopJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'No company associated with this user',
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 5;
      const topJobs = await companyService.getTopJobs(companyId.toString(), limit);

      res.json({
        status: 'success',
        data: topJobs,
      });
    } catch (error) {
      console.error('Error getting top jobs:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get top jobs',
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
      const tag = await companyService.createOrGetSkillTag(name);
      res.status(201).json({ status: 'success', data: tag });
    } catch (error) {
      console.error('Error creating skill tag:', error);
      res.status(500).json({ status: 'error', code: 'INTERNAL_ERROR', message: 'Failed to create skill tag' });
    }
  }

  // ============ Flat Applicant Routes (jobId resolved server-side) ============

  /** GET /api/v1/company/applicants */
  async listApplicants(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({ status: 'error', code: 'FORBIDDEN', message: 'No company associated with this user' });
        return;
      }
      const result = await companyService.listApplicantsForCompany(companyId.toString(), {
        status: req.query.status as ApplicationStatus | undefined,
        jobId: req.query.jobId as string | undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        referred_only: req.query.referred_only === 'true',
      });
      res.json({ status: 'success', data: result.applications, pagination: result.pagination });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list applicants';
      console.error('Error listing applicants:', error);
      res.status(400).json({ status: 'error', code: 'ERROR', message });
    }
  }

  /** GET /api/v1/company/applicants/:applicationId */
  async getApplicantById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({ status: 'error', code: 'FORBIDDEN', message: 'No company associated with this user' });
        return;
      }
      const data = await companyService.getApplicantFullDetail(
        companyId.toString(), req.params.applicationId
      );
      res.json({ status: 'success', data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get applicant';
      console.error('Error getting applicant:', error);
      res.status(400).json({ status: 'error', code: 'ERROR', message });
    }
  }

  /** PUT /api/v1/company/applicants/:applicationId/status */
  async updateApplicantStatusFlat(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const userId = req.user?.sub;
      const userRole = req.user?.role;
      if (!companyId || !userId || !userRole) {
        res.status(403).json({ status: 'error', code: 'FORBIDDEN', message: 'Forbidden' });
        return;
      }
      const application = await Application.findById(req.params.applicationId).select('job_id');
      if (!application) {
        res.status(404).json({ status: 'error', code: 'NOT_FOUND', message: 'Application not found' });
        return;
      }
      const { status, note } = req.body;
      let result;
      if (status === 'offer_extended') {
        result = await companyService.extendOffer(
          companyId.toString(), req.params.applicationId, userId, userRole, note
        );
      } else {
        result = await companyService.updateApplicationStatus(
          companyId.toString(), application.job_id.toString(), req.params.applicationId,
          status, userId, userRole, note
        );
      }
      res.json({ status: 'success', data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update status';
      console.error('Error updating status:', error);
      res.status(400).json({ status: 'error', code: 'ERROR', message });
    }
  }

  /** POST /api/v1/company/applicants/:applicationId/screen */
  async screenApplicant(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const userId = req.user?.sub;
      if (!companyId || !userId) {
        res.status(403).json({ status: 'error', code: 'FORBIDDEN', message: 'Forbidden' });
        return;
      }
      const force =
        req.query.force === '1' ||
        req.query.force === 'true' ||
        req.body?.force === true;
      const data = await companyService.screenApplicant(
        companyId.toString(), req.params.applicationId, userId,
        { force }
      );
      res.status(201).json({ status: 'success', data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to screen applicant';
      console.error('Error screening applicant:', error);
      res.status(400).json({ status: 'error', code: 'ERROR', message });
    }
  }

  /** GET /api/v1/company/applicants/:applicationId/notes */
  async getApplicantNotesFlat(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(403).json({ status: 'error', code: 'FORBIDDEN', message: 'Forbidden' });
        return;
      }
      const application = await Application.findById(req.params.applicationId).select('job_id');
      if (!application) {
        res.status(404).json({ status: 'error', code: 'NOT_FOUND', message: 'Application not found' });
        return;
      }
      const data = await companyService.getApplicantNotes(
        companyId.toString(), application.job_id.toString(), req.params.applicationId
      );
      res.json({ status: 'success', data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get notes';
      console.error('Error getting notes:', error);
      res.status(400).json({ status: 'error', code: 'ERROR', message });
    }
  }

  /** POST /api/v1/company/applicants/:applicationId/notes */
  async addApplicantNoteFlat(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const userId = req.user?.sub;
      if (!companyId || !userId) {
        res.status(403).json({ status: 'error', code: 'FORBIDDEN', message: 'Forbidden' });
        return;
      }
      const application = await Application.findById(req.params.applicationId).select('job_id');
      if (!application) {
        res.status(404).json({ status: 'error', code: 'NOT_FOUND', message: 'Application not found' });
        return;
      }
      const { note, content } = req.body;
      const text = note ?? content;
      if (!text || typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ status: 'error', code: 'VALIDATION_ERROR', message: 'note is required' });
        return;
      }
      const data = await companyService.addApplicantNote(
        companyId.toString(), application.job_id.toString(), req.params.applicationId, userId, text.trim()
      );
      res.status(201).json({ status: 'success', data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add note';
      console.error('Error adding note:', error);
      res.status(400).json({ status: 'error', code: 'ERROR', message });
    }
  }

  /** POST /api/v1/company/applicants/:applicationId/interviews */
  async scheduleInterviewFlat(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const userId = req.user?.sub;
      if (!companyId || !userId) {
        res.status(403).json({ status: 'error', code: 'FORBIDDEN', message: 'Forbidden' });
        return;
      }
      const application = await Application.findById(req.params.applicationId).select('job_id');
      if (!application) {
        res.status(404).json({ status: 'error', code: 'NOT_FOUND', message: 'Application not found' });
        return;
      }
      const userRole = req.user?.role ?? 'company_owner';
      const data = await companyService.scheduleInterview(
        companyId.toString(),
        application.job_id.toString(),
        req.params.applicationId,
        userId,
        req.body,
        userRole
      );
      res.status(201).json({ status: 'success', data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to schedule interview';
      console.error('Error scheduling interview:', error);
      res.status(400).json({ status: 'error', code: 'ERROR', message });
    }
  }
}

export const companyController = new CompanyController();
export default companyController;
