import { Router } from 'express';
import { publicController } from './public.controller.js';

const router = Router();

/**
 * Public routes - no authentication required
 */

// GET /api/v1/public/jobs - Search jobs with filters
router.get('/jobs', (req, res, next) => publicController.searchJobs(req, res).catch(next));

// GET /api/v1/public/jobs/:jobId - Get single job
router.get('/jobs/:jobId', (req, res, next) => publicController.getJobById(req, res).catch(next));

// GET /api/v1/public/skill-tags - Get all skill tags
router.get('/skill-tags', (req, res, next) => publicController.getSkillTags(req, res).catch(next));

// GET /api/v1/public/job-categories - Get all job categories
router.get('/job-categories', (req, res, next) => publicController.getJobCategories(req, res).catch(next));

// GET /api/v1/public/companies - Search approved companies
router.get('/companies', (req, res, next) => publicController.searchCompanies(req, res).catch(next));

// GET /api/v1/public/companies/industries - Distinct industries for filters
router.get('/companies/industries', (req, res, next) => publicController.listCompanyIndustries(req, res).catch(next));

// GET /api/v1/public/companies/:companyId/jobs - Active jobs for the company
router.get('/companies/:companyId/jobs', (req, res, next) => publicController.getCompanyJobs(req, res).catch(next));

// GET /api/v1/public/companies/:companyId - Get company profile
router.get('/companies/:companyId', (req, res, next) => publicController.getCompanyById(req, res).catch(next));

// GET /api/v1/public/config - Client-safe configuration (API keys scoped to frontend use)
router.get('/config', (req, res, next) => publicController.getConfig(req, res).catch(next));

export default router;
