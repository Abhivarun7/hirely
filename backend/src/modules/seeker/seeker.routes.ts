import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { uploadResume, uploadAvatar } from '../../middleware/upload.js';
import { seekerController } from './seeker.controller.js';
import homeRoutes from './home.routes.js';

const router = Router();

// Home feed (recommended jobs + nearby companies). Mounted first so its paths
// resolve before the more general /jobs/* routes below.
router.use('/home', homeRoutes);

/**
 * All routes require job_seeker role
 */

// Profile routes
router.get(
  '/profile',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.getProfile(req, res).catch(next)
);

router.put(
  '/profile',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.updateProfile(req, res).catch(next)
);

router.put(
  '/profile/visibility',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.updateVisibility(req, res).catch(next)
);

// Education routes
router.post(
  '/profile/education',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.addEducation(req, res).catch(next)
);

router.put(
  '/profile/education/:id',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.updateEducation(req, res).catch(next)
);

router.delete(
  '/profile/education/:id',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.deleteEducation(req, res).catch(next)
);

// Experience routes
router.post(
  '/profile/experience',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.addExperience(req, res).catch(next)
);

router.put(
  '/profile/experience/:id',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.updateExperience(req, res).catch(next)
);

router.delete(
  '/profile/experience/:id',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.deleteExperience(req, res).catch(next)
);

// Skills routes
router.post(
  '/profile/skills',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.addSkills(req, res).catch(next)
);

router.delete(
  '/profile/skills/:skillTagId',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.removeSkill(req, res).catch(next)
);

router.post(
  '/profile/skill-tags',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.createSkillTag(req, res).catch(next)
);

// Certification routes
router.post(
  '/profile/certifications',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.addCertification(req, res).catch(next)
);

router.put(
  '/profile/certifications/:id',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.updateCertification(req, res).catch(next)
);

router.delete(
  '/profile/certifications/:id',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.deleteCertification(req, res).catch(next)
);

// Avatar routes
router.post(
  '/profile/avatar',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => uploadAvatar(req, res, (err: unknown) => {
    if (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      return res.status(400).json({ status: 'error', code: 'UPLOAD_ERROR', message: msg });
    }
    seekerController.uploadAvatar(req, res).catch(next);
  })
);

router.delete(
  '/profile/avatar',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.removeAvatar(req, res).catch(next)
);

// Resume routes
router.post(
  '/profile/resumes',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => uploadResume(req, res, (err: unknown) => {
    if (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      return res.status(400).json({ status: 'error', code: 'UPLOAD_ERROR', message: msg });
    }
    seekerController.uploadResume(req, res).catch(next);
  })
);

router.delete(
  '/profile/resumes/:id',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.deleteResume(req, res).catch(next)
);

router.put(
  '/profile/resumes/:id/default',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.setDefaultResume(req, res).catch(next)
);

// Job routes
router.get(
  '/jobs',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.searchJobs(req, res).catch(next)
);

router.get(
  '/jobs/recommended',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.getRecommendedJobs(req, res).catch(next)
);

router.get(
  '/jobs/saved',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.getSavedJobs(req, res).catch(next)
);

router.get(
  '/jobs/:jobId',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.getJobById(req, res).catch(next)
);

router.post(
  '/jobs/:jobId/save',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.saveJob(req, res).catch(next)
);

router.delete(
  '/jobs/:jobId/save',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.unsaveJob(req, res).catch(next)
);

// Application routes
router.post(
  '/jobs/:jobId/apply',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.createApplication(req, res).catch(next)
);

router.get(
  '/applications',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.getApplications(req, res).catch(next)
);

router.get(
  '/applications/:id',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.getApplicationById(req, res).catch(next)
);

router.delete(
  '/applications/:id',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.deleteApplication(req, res).catch(next)
);

// Notification routes
router.get(
  '/notifications',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.getNotifications(req, res).catch(next)
);

router.put(
  '/notifications/:id/read',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.markNotificationRead(req, res).catch(next)
);

router.put(
  '/notifications/read-all',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => seekerController.markAllNotificationsRead(req, res).catch(next)
);

export default router;
