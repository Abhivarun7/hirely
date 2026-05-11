import { Response } from 'express';
import { adminService } from './admin.service.js';
import { adminAIService } from './admin.ai.service.js';
import { AuthenticatedRequest } from '../../middleware/authenticate.js';

export class AdminController {
  // ============ Company Management ============

  /**
   * GET /api/v1/admin/companies
   */
  async getCompanies(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await adminService.getCompanies({ page, limit, status, search });

      res.json({
        status: 'success',
        data: result.companies,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting companies:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get companies',
      });
    }
  }

  /**
   * GET /api/v1/admin/companies/:companyId
   */
  async getCompanyById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const company = await adminService.getCompanyById(companyId);

      if (!company) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Company not found',
        });
        return;
      }

      res.json({
        status: 'success',
        data: company,
      });
    } catch (error) {
      console.error('Error getting company:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get company',
      });
    }
  }

  /**
   * POST /api/v1/admin/companies/:companyId/approve
   */
  async approveCompany(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const adminId = req.user?.sub || '';
      const { notes } = req.body;

      const company = await adminService.approveCompany(companyId, adminId, notes);

      res.json({
        status: 'success',
        data: company,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve company';
      console.error('Error approving company:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * POST /api/v1/admin/companies/:companyId/reject
   */
  async rejectCompany(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const adminId = req.user?.sub || '';
      const { reason } = req.body;

      const company = await adminService.rejectCompany(companyId, adminId, reason);

      res.json({
        status: 'success',
        data: company,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reject company';
      console.error('Error rejecting company:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * POST /api/v1/admin/companies/:companyId/suspend
   */
  async suspendCompany(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const adminId = req.user?.sub || '';
      const { reason } = req.body;

      const company = await adminService.suspendCompany(companyId, adminId, reason);

      res.json({
        status: 'success',
        data: company,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to suspend company';
      console.error('Error suspending company:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * POST /api/v1/admin/companies/:companyId/ban
   */
  async banCompany(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const adminId = req.user?.sub || '';
      const { reason } = req.body;

      const company = await adminService.banCompany(companyId, adminId, reason);

      res.json({
        status: 'success',
        data: company,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to ban company';
      console.error('Error banning company:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * GET /api/v1/admin/companies/:companyId/jobs
   */
  async getCompanyJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await adminService.getCompanyJobs(companyId, page, limit);

      res.json({
        status: 'success',
        data: result.jobs,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting company jobs:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get company jobs',
      });
    }
  }

  /**
   * GET /api/v1/admin/companies/:companyId/team
   */
  async getCompanyTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const team = await adminService.getCompanyTeam(companyId);

      res.json({
        status: 'success',
        data: team,
      });
    } catch (error) {
      console.error('Error getting company team:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get company team',
      });
    }
  }

  // ============ User Management ============

  /**
   * GET /api/v1/admin/users
   */
  async getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const role = req.query.role as string | undefined;
      const is_banned = req.query.is_banned === 'true' ? true : req.query.is_banned === 'false' ? false : undefined;
      const search = req.query.search as string | undefined;

      const result = await adminService.getUsers({ page, limit, role, is_banned, search });

      res.json({
        status: 'success',
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get users',
      });
    }
  }

  /**
   * GET /api/v1/admin/users/:userId
   */
  async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const user = await adminService.getUserById(userId);

      if (!user) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'User not found',
        });
        return;
      }

      res.json({
        status: 'success',
        data: user,
      });
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get user',
      });
    }
  }

  /**
   * POST /api/v1/admin/users/:userId/suspend
   */
  async suspendUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const adminId = req.user?.sub || '';
      const { reason } = req.body;

      const user = await adminService.suspendUser(userId, adminId, reason);

      res.json({
        status: 'success',
        data: user,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to suspend user';
      console.error('Error suspending user:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * POST /api/v1/admin/users/:userId/ban
   */
  async banUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const adminId = req.user?.sub || '';
      const { reason } = req.body;

      const user = await adminService.banUser(userId, adminId, reason);

      res.json({
        status: 'success',
        data: user,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to ban user';
      console.error('Error banning user:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * GET /api/v1/admin/users/:userId/applications
   */
  async getUserApplications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await adminService.getUserApplications(userId, page, limit);

      res.json({
        status: 'success',
        data: result.applications,
        pagination: result.pagination,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get user applications';
      console.error('Error getting user applications:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  // ============ Content Moderation ============

  /**
   * GET /api/v1/admin/jobs
   */
  async getJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;
      const company_id = req.query.company_id as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await adminService.getJobs({ page, limit, status, company_id, search });

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
   * GET /api/v1/admin/jobs/:jobId
   */
  async getJobById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const job = await adminService.getJobById(jobId);

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
      console.error('Error getting job:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get job',
      });
    }
  }

  /**
   * POST /api/v1/admin/jobs/:jobId/remove
   */
  async removeJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const adminId = req.user?.sub || '';
      const { reason } = req.body;

      const job = await adminService.removeJob(jobId, adminId, reason);

      res.json({
        status: 'success',
        data: job,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove job';
      console.error('Error removing job:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  // ============ Categories ============

  /**
   * GET /api/v1/admin/job-categories
   */
  async getCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const categories = await adminService.getCategories();

      res.json({
        status: 'success',
        data: categories,
      });
    } catch (error) {
      console.error('Error getting categories:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get categories',
      });
    }
  }

  /**
   * POST /api/v1/admin/job-categories
   */
  async createCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.user?.sub || '';
      const category = await adminService.createCategory(req.body, adminId);

      res.status(201).json({
        status: 'success',
        data: category,
      });
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to create category',
      });
    }
  }

  /**
   * PUT /api/v1/admin/job-categories/:id
   */
  async updateCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.user?.sub || '';
      const category = await adminService.updateCategory(id, req.body, adminId);

      if (!category) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Category not found',
        });
        return;
      }

      res.json({
        status: 'success',
        data: category,
      });
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to update category',
      });
    }
  }

  /**
   * DELETE /api/v1/admin/job-categories/:id
   */
  async deleteCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.user?.sub || '';
      await adminService.deleteCategory(id, adminId);

      res.json({
        status: 'success',
        message: 'Category deleted',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete category';
      console.error('Error deleting category:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  // ============ Skill Tags ============

  /**
   * GET /api/v1/admin/skill-tags
   */
  async getSkillTags(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const skillTags = await adminService.getSkillTags();

      res.json({
        status: 'success',
        data: skillTags,
      });
    } catch (error) {
      console.error('Error getting skill tags:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get skill tags',
      });
    }
  }

  /**
   * POST /api/v1/admin/skill-tags
   */
  async createSkillTag(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.user?.sub || '';
      const skillTag = await adminService.createSkillTag(req.body, adminId);

      res.status(201).json({
        status: 'success',
        data: skillTag,
      });
    } catch (error) {
      console.error('Error creating skill tag:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to create skill tag',
      });
    }
  }

  /**
   * PUT /api/v1/admin/skill-tags/:id
   */
  async updateSkillTag(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.user?.sub || '';
      const skillTag = await adminService.updateSkillTag(id, req.body, adminId);

      if (!skillTag) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Skill tag not found',
        });
        return;
      }

      res.json({
        status: 'success',
        data: skillTag,
      });
    } catch (error) {
      console.error('Error updating skill tag:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to update skill tag',
      });
    }
  }

  /**
   * DELETE /api/v1/admin/skill-tags/:id
   */
  async deleteSkillTag(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.user?.sub || '';
      await adminService.deleteSkillTag(id, adminId);

      res.json({
        status: 'success',
        message: 'Skill tag deleted',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete skill tag';
      console.error('Error deleting skill tag:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * POST /api/v1/admin/skill-tags/:id/merge
   */
  async mergeSkillTag(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.user?.sub || '';
      const { target_id } = req.body;

      const result = await adminService.mergeSkillTag(id, target_id, adminId);

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to merge skill tag';
      console.error('Error merging skill tag:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  // ============ Support Tickets ============

  /**
   * GET /api/v1/admin/tickets
   */
  async getTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;

      const result = await adminService.getTickets({ page, limit, status });

      res.json({
        status: 'success',
        data: result.tickets,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting tickets:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get tickets',
      });
    }
  }

  /**
   * GET /api/v1/admin/tickets/:ticketId
   */
  async getTicketById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const ticket = await adminService.getTicketById(ticketId);

      res.json({
        status: 'success',
        data: ticket,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get ticket';
      console.error('Error getting ticket:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * PUT /api/v1/admin/tickets/:ticketId/assign
   */
  async assignTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const adminId = req.user?.sub || '';
      const { assigned_to } = req.body;

      const ticket = await adminService.assignTicket(ticketId, assigned_to, adminId);

      res.json({
        status: 'success',
        data: ticket,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to assign ticket';
      console.error('Error assigning ticket:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * PUT /api/v1/admin/tickets/:ticketId/status
   */
  async updateTicketStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const adminId = req.user?.sub || '';
      const { status } = req.body;

      const ticket = await adminService.updateTicketStatus(ticketId, status, adminId);

      res.json({
        status: 'success',
        data: ticket,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update ticket status';
      console.error('Error updating ticket status:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * POST /api/v1/admin/tickets/:ticketId/reply
   */
  async uploadTicketAttachments(req: AuthenticatedRequest, res: Response): Promise<void> {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      res.status(400).json({ status: 'error', code: 'NO_FILE', message: 'No files uploaded' });
      return;
    }
    const data = files.map((f) => ({
      url: `/uploads/tickets/${f.filename}`,
      filename: f.originalname,
      mime: f.mimetype,
      size: f.size,
    }));
    res.status(201).json({ status: 'success', data });
  }

  async uploadAdminAvatar(req: AuthenticatedRequest, res: Response): Promise<void> {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ status: 'error', code: 'NO_FILE', message: 'No file uploaded' });
      return;
    }
    res.status(201).json({
      status: 'success',
      data: { url: `/uploads/avatars/${file.filename}` },
    });
  }

  async replyTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const senderId = req.user?.sub || '';
      const { message, attachments } = req.body;

      const reply = await adminService.replyTicket(ticketId, senderId, message, attachments);

      res.status(201).json({
        status: 'success',
        data: reply,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reply to ticket';
      console.error('Error replying to ticket:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  // ============ Analytics ============

  /**
   * GET /api/v1/admin/analytics/overview
   */
  async getOverviewAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const period = (req.query.period as string) || '30d';
      const analytics = await adminService.getOverviewAnalytics(period);

      res.json({
        status: 'success',
        data: analytics,
      });
    } catch (error) {
      console.error('Error getting overview analytics:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get overview analytics',
      });
    }
  }

  /**
   * GET /api/v1/admin/analytics/users
   */
  async getUserAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const period = (req.query.period as string) || '30d';
      const analytics = await adminService.getUserAnalytics(period);

      res.json({
        status: 'success',
        data: analytics,
      });
    } catch (error) {
      console.error('Error getting user analytics:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get user analytics',
      });
    }
  }

  /**
   * GET /api/v1/admin/analytics/jobs
   */
  async getJobAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const period = (req.query.period as string) || '30d';
      const analytics = await adminService.getJobAnalytics(period);

      res.json({
        status: 'success',
        data: analytics,
      });
    } catch (error) {
      console.error('Error getting job analytics:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get job analytics',
      });
    }
  }

  /**
   * GET /api/v1/admin/analytics/applications
   */
  async getApplicationAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const period = (req.query.period as string) || '30d';
      const analytics = await adminService.getApplicationAnalytics(period);

      res.json({
        status: 'success',
        data: analytics,
      });
    } catch (error) {
      console.error('Error getting application analytics:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get application analytics',
      });
    }
  }

  /**
   * GET /api/v1/admin/analytics/companies
   */
  async getCompanyAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const analytics = await adminService.getCompanyAnalytics();

      res.json({
        status: 'success',
        data: analytics,
      });
    } catch (error) {
      console.error('Error getting company analytics:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get company analytics',
      });
    }
  }

  // ============ Audit Logs ============

  /**
   * GET /api/v1/admin/audit-logs
   */
  async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const actor_id = req.query.actor_id as string | undefined;
      const action = req.query.action as string | undefined;
      const entity_type = req.query.entity_type as string | undefined;
      const entity_id = req.query.entity_id as string | undefined;

      const result = await adminService.getAuditLogs({
        page,
        limit,
        actor_id,
        action,
        entity_type,
        entity_id,
      });

      res.json({
        status: 'success',
        data: result.logs,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting audit logs:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get audit logs',
      });
    }
  }

  // ============ System Config ============

  /**
   * GET /api/v1/admin/config
   */
  async getConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const keys = req.query.keys as string | undefined;
      const config = await adminService.getConfig(keys);

      res.json({
        status: 'success',
        data: config,
      });
    } catch (error) {
      console.error('Error getting config:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get config',
      });
    }
  }

  /**
   * PUT /api/v1/admin/config
   */
  async updateConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.user?.sub || '';
      const { key, value } = req.body;

      const config = await adminService.updateConfig(key, value, adminId);

      res.json({
        status: 'success',
        data: config,
      });
    } catch (error) {
      console.error('Error updating config:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to update config',
      });
    }
  }

  // ============ Admin Accounts ============

  /**
   * GET /api/v1/admin/admins
   */
  async getAdmins(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await adminService.getAdmins(page, limit);

      res.json({
        status: 'success',
        data: result.admins,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting admins:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get admins',
      });
    }
  }

  /**
   * POST /api/v1/admin/admins
   */
  async createAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.user?.sub || '';
      const {
        email,
        role_id,
        extra_permissions,
        first_name,
        last_name,
        phone,
        employee_id,
        avatar_url,
      } = req.body;

      const admin = await adminService.createAdmin(
        email,
        role_id,
        adminId,
        extra_permissions,
        { first_name, last_name, phone, employee_id, avatar_url }
      );

      res.status(201).json({
        status: 'success',
        data: admin,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create admin';
      console.error('Error creating admin:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * PUT /api/v1/admin/admins/:id
   */
  async updateAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const actorId = req.user?.sub || '';

      const admin = await adminService.updateAdmin(id, req.body, actorId);

      if (!admin) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Admin not found',
        });
        return;
      }

      res.json({
        status: 'success',
        data: admin,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update admin';
      console.error('Error updating admin:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }

  /**
   * DELETE /api/v1/admin/admins/:id
   */
  async deleteAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const actorId = req.user?.sub || '';

      await adminService.deleteAdmin(id, actorId);

      res.json({
        status: 'success',
        message: 'Admin deleted',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete admin';
      console.error('Error deleting admin:', error);
      res.status(400).json({
        status: 'error',
        code: 'ERROR',
        message,
      });
    }
  }
  // ============ AI features ============

  /**
   * GET /api/v1/admin/ai/jobs/:jobId/candidates
   * AI-ranked candidate suggestions for a given job.
   */
  async suggestCandidatesForJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const limit = Math.min(20, parseInt(req.query.limit as string) || 10);

      const suggestions = await adminAIService.suggestCandidatesForJob(jobId, limit);

      res.json({
        status: 'success',
        data: suggestions,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to suggest candidates';
      console.error('Error suggesting candidates:', error);
      res.status(500).json({
        status: 'error',
        code: 'AI_ERROR',
        message,
      });
    }
  }

  /**
   * GET /api/v1/admin/ai/seekers/:userId/insights
   * AI insights about what a seeker is best for and what they should improve.
   */
  async getSeekerInsights(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const insights = await adminAIService.getSeekerInsights(userId);

      res.json({
        status: 'success',
        data: insights,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get seeker insights';
      console.error('Error getting seeker insights:', error);
      res.status(500).json({
        status: 'error',
        code: 'AI_ERROR',
        message,
      });
    }
  }

  /**
   * GET /api/v1/admin/seekers
   * Seeker directory with quick profile stats.
   */
  async getSeekerDirectory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;

      const result = await adminAIService.getSeekerDirectory(page, limit, search);

      res.json({
        status: 'success',
        data: result.seekers,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting seeker directory:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get seekers',
      });
    }
  }
}

export const adminController = new AdminController();
export default adminController;
