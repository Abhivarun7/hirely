import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { validate } from '../../middleware/validate.js';
import { uploadTicketAttachments, uploadAvatar } from '../../middleware/upload.js';
import { adminController } from './admin.controller.js';
import { officialsController } from './officials.controller.js';
import { roleController } from './role.controller.js';
import { ticketTemplateController } from './ticketTemplate.controller.js';
import {
  createOfficialSchema,
  updateOfficialSchema,
  listOfficialsSchema,
  officialIdSchema,
} from './officials.schema.js';

const router = Router();

/**
 * Admin routes — gated by fine-grained permissions instead of role enums.
 * Permissions are sourced from the user's Role record (admin_role_id) plus
 * any extra_permissions on the user. See constants/permissions.ts.
 *
 * Every admin route still goes through authenticate first, then requires the
 * relevant permission. Anyone without admin_role_id falls back to the system
 * role mapping so legacy admins keep working.
 */

const ADMIN_ROLES = ['super_admin', 'moderator', 'support_admin', 'analytics_admin'] as const;

// Companies
router.get('/companies', authenticate, authorize(...ADMIN_ROLES), requirePermission('companies:view'), (req, res, next) =>
  adminController.getCompanies(req, res).catch(next)
);
router.get(
  '/companies/:companyId',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('companies:view'),
  (req, res, next) => adminController.getCompanyById(req, res).catch(next)
);
router.post(
  '/companies/:companyId/approve',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('companies:approve'),
  (req, res, next) => adminController.approveCompany(req, res).catch(next)
);
router.post(
  '/companies/:companyId/reject',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('companies:reject'),
  (req, res, next) => adminController.rejectCompany(req, res).catch(next)
);
router.post(
  '/companies/:companyId/suspend',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('companies:suspend'),
  (req, res, next) => adminController.suspendCompany(req, res).catch(next)
);
router.post(
  '/companies/:companyId/ban',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('companies:ban'),
  (req, res, next) => adminController.banCompany(req, res).catch(next)
);
router.get(
  '/companies/:companyId/jobs',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('companies:view'),
  (req, res, next) => adminController.getCompanyJobs(req, res).catch(next)
);
router.get(
  '/companies/:companyId/team',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('companies:view'),
  (req, res, next) => adminController.getCompanyTeam(req, res).catch(next)
);

// Users
router.get('/users', authenticate, authorize(...ADMIN_ROLES), requirePermission('users:view'), (req, res, next) =>
  adminController.getUsers(req, res).catch(next)
);
router.get(
  '/users/:userId',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('users:view'),
  (req, res, next) => adminController.getUserById(req, res).catch(next)
);
router.post(
  '/users/:userId/suspend',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('users:suspend'),
  (req, res, next) => adminController.suspendUser(req, res).catch(next)
);
router.post(
  '/users/:userId/ban',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('users:ban'),
  (req, res, next) => adminController.banUser(req, res).catch(next)
);
router.get(
  '/users/:userId/applications',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('users:view'),
  (req, res, next) => adminController.getUserApplications(req, res).catch(next)
);

// Job moderation
router.get('/jobs', authenticate, authorize(...ADMIN_ROLES), requirePermission('jobs_moderation:view'), (req, res, next) =>
  adminController.getJobs(req, res).catch(next)
);
router.get(
  '/jobs/:jobId',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('jobs_moderation:view'),
  (req, res, next) => adminController.getJobById(req, res).catch(next)
);
router.post(
  '/jobs/:jobId/remove',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('jobs_moderation:remove'),
  (req, res, next) => adminController.removeJob(req, res).catch(next)
);

// Job categories
router.get(
  '/job-categories',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('job_categories:view'),
  (req, res, next) => adminController.getCategories(req, res).catch(next)
);
router.post(
  '/job-categories',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('job_categories:create'),
  (req, res, next) => adminController.createCategory(req, res).catch(next)
);
router.put(
  '/job-categories/:id',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('job_categories:edit'),
  (req, res, next) => adminController.updateCategory(req, res).catch(next)
);
router.delete(
  '/job-categories/:id',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('job_categories:delete'),
  (req, res, next) => adminController.deleteCategory(req, res).catch(next)
);

// Skill tags
router.get('/skill-tags', authenticate, authorize(...ADMIN_ROLES), requirePermission('skill_tags:view'), (req, res, next) =>
  adminController.getSkillTags(req, res).catch(next)
);
router.post(
  '/skill-tags',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('skill_tags:create'),
  (req, res, next) => adminController.createSkillTag(req, res).catch(next)
);
router.put(
  '/skill-tags/:id',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('skill_tags:edit'),
  (req, res, next) => adminController.updateSkillTag(req, res).catch(next)
);
router.delete(
  '/skill-tags/:id',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('skill_tags:delete'),
  (req, res, next) => adminController.deleteSkillTag(req, res).catch(next)
);
router.post(
  '/skill-tags/:id/merge',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('skill_tags:merge'),
  (req, res, next) => adminController.mergeSkillTag(req, res).catch(next)
);

// Support tickets
router.get('/tickets', authenticate, authorize(...ADMIN_ROLES), requirePermission('tickets:view'), (req, res, next) =>
  adminController.getTickets(req, res).catch(next)
);
router.get(
  '/tickets/:ticketId',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('tickets:view'),
  (req, res, next) => adminController.getTicketById(req, res).catch(next)
);
router.put(
  '/tickets/:ticketId/assign',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('tickets:assign'),
  (req, res, next) => adminController.assignTicket(req, res).catch(next)
);
router.put(
  '/tickets/:ticketId/status',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('tickets:edit'),
  (req, res, next) => adminController.updateTicketStatus(req, res).catch(next)
);
router.post(
  '/tickets/:ticketId/reply',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('tickets:reply'),
  (req, res, next) => adminController.replyTicket(req, res).catch(next)
);

// Ticket reply templates (shared list, manageable by anyone with the perm)
router.get(
  '/ticket-templates',
  authenticate,
  authorize(...ADMIN_ROLES),
  requirePermission('ticket_templates:view'),
  (req, res, next) => ticketTemplateController.list(req, res).catch(next)
);
router.post(
  '/ticket-templates',
  authenticate,
  authorize(...ADMIN_ROLES),
  requirePermission('ticket_templates:create'),
  (req, res, next) => ticketTemplateController.create(req, res).catch(next)
);
router.put(
  '/ticket-templates/:id',
  authenticate,
  authorize(...ADMIN_ROLES),
  requirePermission('ticket_templates:edit'),
  (req, res, next) => ticketTemplateController.update(req, res).catch(next)
);
router.delete(
  '/ticket-templates/:id',
  authenticate,
  authorize(...ADMIN_ROLES),
  requirePermission('ticket_templates:delete'),
  (req, res, next) => ticketTemplateController.remove(req, res).catch(next)
);
router.post(
  '/tickets/:ticketId/attachments',
  authenticate,
  authorize(...ADMIN_ROLES),
  requirePermission('tickets:reply'),
  (req: Request, res: Response, next: NextFunction) => {
    uploadTicketAttachments(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        res.status(400).json({ status: 'error', code: 'UPLOAD_ERROR', message });
        return;
      }
      next();
    });
  },
  (req, res, next) => adminController.uploadTicketAttachments(req, res).catch(next)
);

// Analytics
router.get(
  '/analytics/overview',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('analytics:view'),
  (req, res, next) => adminController.getOverviewAnalytics(req, res).catch(next)
);
router.get(
  '/analytics/users',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('analytics:view'),
  (req, res, next) => adminController.getUserAnalytics(req, res).catch(next)
);
router.get(
  '/analytics/jobs',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('analytics:view'),
  (req, res, next) => adminController.getJobAnalytics(req, res).catch(next)
);
router.get(
  '/analytics/applications',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('analytics:view'),
  (req, res, next) => adminController.getApplicationAnalytics(req, res).catch(next)
);
router.get(
  '/analytics/companies',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('analytics:view'),
  (req, res, next) => adminController.getCompanyAnalytics(req, res).catch(next)
);

// Audit logs
router.get(
  '/audit-logs',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('audit_logs:view'),
  (req, res, next) => adminController.getAuditLogs(req, res).catch(next)
);

// System config
router.get('/config', authenticate, authorize(...ADMIN_ROLES), requirePermission('system_config:view'), (req, res, next) =>
  adminController.getConfig(req, res).catch(next)
);
router.put('/config', authenticate, authorize(...ADMIN_ROLES), requirePermission('system_config:edit'), (req, res, next) =>
  adminController.updateConfig(req, res).catch(next)
);

// Admin accounts
router.get('/admins', authenticate, authorize(...ADMIN_ROLES), requirePermission('admins:view'), (req, res, next) =>
  adminController.getAdmins(req, res).catch(next)
);
router.post('/admins', authenticate, authorize(...ADMIN_ROLES), requirePermission('admins:create'), (req, res, next) =>
  adminController.createAdmin(req, res).catch(next)
);
router.put(
  '/admins/:id',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('admins:edit'),
  (req, res, next) => adminController.updateAdmin(req, res).catch(next)
);
router.delete(
  '/admins/:id',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('admins:delete'),
  (req, res, next) => adminController.deleteAdmin(req, res).catch(next)
);

// Admin avatar upload — any admin who can edit admins can use it.
router.post(
  '/admins/avatar',
  authenticate,
  authorize(...ADMIN_ROLES),
  requirePermission('admins:create'),
  (req: Request, res: Response, next: NextFunction) => {
    uploadAvatar(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        res.status(400).json({ status: 'error', code: 'UPLOAD_ERROR', message });
        return;
      }
      next();
    });
  },
  (req, res, next) => adminController.uploadAdminAvatar(req, res).catch(next)
);

// Roles + permission catalog
router.get('/permissions/catalog', authenticate, authorize(...ADMIN_ROLES), requirePermission('roles:view'), (req, res, next) =>
  roleController.getCatalog(req, res).catch(next)
);
router.get('/roles', authenticate, authorize(...ADMIN_ROLES), requirePermission('roles:view'), (req, res, next) =>
  roleController.list(req, res).catch(next)
);
router.get('/roles/:id', authenticate, authorize(...ADMIN_ROLES), requirePermission('roles:view'), (req, res, next) =>
  roleController.getById(req, res).catch(next)
);
router.post('/roles', authenticate, authorize(...ADMIN_ROLES), requirePermission('roles:create'), (req, res, next) =>
  roleController.create(req, res).catch(next)
);
router.put('/roles/:id', authenticate, authorize(...ADMIN_ROLES), requirePermission('roles:edit'), (req, res, next) =>
  roleController.update(req, res).catch(next)
);
router.delete('/roles/:id', authenticate, authorize(...ADMIN_ROLES), requirePermission('roles:delete'), (req, res, next) =>
  roleController.remove(req, res).catch(next)
);

// Seekers
router.get('/seekers', authenticate, authorize(...ADMIN_ROLES), requirePermission('seekers:view'), (req, res, next) =>
  adminController.getSeekerDirectory(req, res).catch(next)
);

// AI features
router.get(
  '/ai/jobs/:jobId/candidates',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('ai_features:view'),
  (req, res, next) => adminController.suggestCandidatesForJob(req, res).catch(next)
);
router.get(
  '/ai/seekers/:userId/insights',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('ai_features:view'),
  (req, res, next) => adminController.getSeekerInsights(req, res).catch(next)
);

// Employment Officials
router.get(
  '/officials',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('officials:view'),
  validate(listOfficialsSchema),
  (req, res, next) => officialsController.list(req, res).catch(next)
);
router.post(
  '/officials',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('officials:create'),
  validate(createOfficialSchema),
  (req, res, next) => officialsController.create(req, res).catch(next)
);
router.get(
  '/officials/:officialId',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('officials:view'),
  validate(officialIdSchema),
  (req, res, next) => officialsController.getById(req, res).catch(next)
);
router.patch(
  '/officials/:officialId',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('officials:edit'),
  validate(updateOfficialSchema),
  (req, res, next) => officialsController.update(req, res).catch(next)
);
router.post(
  '/officials/:officialId/deactivate',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('officials:deactivate'),
  validate(officialIdSchema),
  (req, res, next) => officialsController.deactivate(req, res).catch(next)
);
router.post(
  '/officials/:officialId/reactivate',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('officials:reactivate'),
  validate(officialIdSchema),
  (req, res, next) => officialsController.reactivate(req, res).catch(next)
);
router.post(
  '/officials/:officialId/resend-welcome',
  authenticate, authorize(...ADMIN_ROLES),
  requirePermission('officials:resend_welcome'),
  validate(officialIdSchema),
  (req, res, next) => officialsController.resendWelcome(req, res).catch(next)
);

export default router;
