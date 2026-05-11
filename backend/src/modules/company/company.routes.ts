import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { companyController } from './company.controller.js';
import { insightsController } from './insights.controller.js';

const router = Router();

/**
 * Company routes - require company roles
 */

// Profile routes
router.get(
  '/profile',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => companyController.getProfile(req, res).catch(next)
);

router.put(
  '/profile',
  authenticate,
  authorize('company_owner', 'hr_manager'),
  (req, res, next) => companyController.updateProfile(req, res).catch(next)
);

router.post(
  '/profile/logo',
  authenticate,
  authorize('company_owner', 'hr_manager'),
  (req, res, next) => companyController.uploadLogo(req, res).catch(next)
);

// Branch routes (owner only for create/delete, owner+hr for read/update)
router.get(
  '/branches',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => companyController.getBranches(req, res).catch(next)
);

router.post(
  '/branches',
  authenticate,
  authorize('company_owner'),
  (req, res, next) => companyController.createBranch(req, res).catch(next)
);

router.put(
  '/branches/:id',
  authenticate,
  authorize('company_owner', 'hr_manager'),
  (req, res, next) => companyController.updateBranch(req, res).catch(next)
);

router.delete(
  '/branches/:id',
  authenticate,
  authorize('company_owner'),
  (req, res, next) => companyController.deleteBranch(req, res).catch(next)
);

// Team routes (owner only)
router.get(
  '/team',
  authenticate,
  authorize('company_owner'),
  (req, res, next) => companyController.getTeam(req, res).catch(next)
);

router.post(
  '/team/invite',
  authenticate,
  authorize('company_owner'),
  (req, res, next) => companyController.inviteTeamMember(req, res).catch(next)
);

router.put(
  '/team/:memberId/role',
  authenticate,
  authorize('company_owner'),
  (req, res, next) => companyController.updateMemberRole(req, res).catch(next)
);

router.delete(
  '/team/:memberId',
  authenticate,
  authorize('company_owner'),
  (req, res, next) => companyController.removeTeamMember(req, res).catch(next)
);

router.get(
  '/team/audit-log',
  authenticate,
  authorize('company_owner'),
  (req, res, next) => companyController.getTeamAuditLog(req, res).catch(next)
);

// Job routes
router.get(
  '/jobs',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => companyController.getJobs(req, res).catch(next)
);

router.post(
  '/jobs',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => companyController.createJob(req, res).catch(next)
);

router.post(
  '/jobs/ai-generate',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => companyController.generateJobWithAI(req, res).catch(next)
);

router.get(
  '/jobs/:jobId',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => companyController.getJobById(req, res).catch(next)
);

router.put(
  '/jobs/:jobId',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => companyController.updateJob(req, res).catch(next)
);

router.delete(
  '/jobs/:jobId',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => companyController.deleteJob(req, res).catch(next)
);

router.post(
  '/jobs/:jobId/publish',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => companyController.publishJob(req, res).catch(next)
);

router.post(
  '/jobs/:jobId/close',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => companyController.closeJob(req, res).catch(next)
);

router.post(
  '/jobs/:jobId/duplicate',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => companyController.duplicateJob(req, res).catch(next)
);

// Applicant routes
router.get(
  '/jobs/:jobId/applicants',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => companyController.getApplicants(req, res).catch(next)
);

router.get(
  '/jobs/:jobId/applicants/:applicationId',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => companyController.getApplicantDetail(req, res).catch(next)
);

router.put(
  '/jobs/:jobId/applicants/:applicationId/status',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter'),
  (req, res, next) => companyController.updateApplicationStatus(req, res).catch(next)
);

router.post(
  '/jobs/:jobId/applicants/:applicationId/notes',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter'),
  (req, res, next) => companyController.addApplicantNote(req, res).catch(next)
);

router.get(
  '/jobs/:jobId/applicants/:applicationId/notes',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => companyController.getApplicantNotes(req, res).catch(next)
);

router.post(
  '/jobs/:jobId/applicants/:applicationId/interview',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter'),
  (req, res, next) => companyController.scheduleInterview(req, res).catch(next)
);

router.get(
  '/jobs/:jobId/applicants/:applicationId/resume',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter'),
  (req, res, next) => companyController.getApplicantResume(req, res).catch(next)
);

// Interview routes
router.put(
  '/interviews/:interviewId',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter'),
  (req, res, next) => companyController.updateInterview(req, res).catch(next)
);

// ─── Flat applicant routes (jobId resolved server-side) ─────────────────────

router.get(
  '/applicants',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => companyController.listApplicants(req, res).catch(next)
);

router.get(
  '/applicants/:applicationId',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => companyController.getApplicantById(req, res).catch(next)
);

router.put(
  '/applicants/:applicationId/status',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter'),
  (req, res, next) => companyController.updateApplicantStatusFlat(req, res).catch(next)
);

router.post(
  '/applicants/:applicationId/screen',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter'),
  (req, res, next) => companyController.screenApplicant(req, res).catch(next)
);

router.get(
  '/applicants/:applicationId/notes',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => companyController.getApplicantNotesFlat(req, res).catch(next)
);

router.post(
  '/applicants/:applicationId/notes',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter'),
  (req, res, next) => companyController.addApplicantNoteFlat(req, res).catch(next)
);

router.post(
  '/applicants/:applicationId/interviews',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter'),
  (req, res, next) => companyController.scheduleInterviewFlat(req, res).catch(next)
);

// Dashboard routes
router.get(
  '/dashboard/stats',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => companyController.getDashboardStats(req, res).catch(next)
);

router.get(
  '/dashboard/pipeline',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter'),
  (req, res, next) => companyController.getDashboardPipeline(req, res).catch(next)
);

router.get(
  '/dashboard/top-jobs',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter'),
  (req, res, next) => companyController.getTopJobs(req, res).catch(next)
);

// Skill tags — create or get by name
router.post(
  '/skill-tags',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter'),
  (req, res, next) => companyController.createSkillTag(req, res).catch(next)
);

// Insights routes (AI insights, suggested seekers, nearby seekers)
router.get(
  '/insights/summary',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => insightsController.getSummary(req, res).catch(next)
);

router.get(
  '/insights/suggested-seekers',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => insightsController.getSuggestedSeekers(req, res).catch(next)
);

router.get(
  '/insights/nearby-seekers',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => insightsController.getNearbySeekers(req, res).catch(next)
);

router.post(
  '/insights/explain-match',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter'),
  (req, res, next) => insightsController.explainMatch(req, res).catch(next)
);

router.post(
  '/insights/invite',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter'),
  (req, res, next) => insightsController.invite(req, res).catch(next)
);

router.get(
  '/insights/invites',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => insightsController.listInvites(req, res).catch(next)
);

router.post(
  '/insights/invites/lookup',
  authenticate,
  authorize('company_owner', 'hr_manager', 'recruiter', 'viewer'),
  (req, res, next) => insightsController.lookupInvites(req, res).catch(next)
);

export default router;
