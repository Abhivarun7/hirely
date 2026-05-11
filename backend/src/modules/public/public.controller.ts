import { Response } from 'express';
import { publicService, JobSearchFilters } from './public.service.js';
import { AuthenticatedRequest } from '../../middleware/authenticate.js';
import { config } from '../../config/env.js';
import { z } from 'zod';
import { recordJobView, buildViewerKey } from '../shared/jobView.service.js';

const jobSearchQuerySchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  branch_id: z.string().optional(),
  near: z.string().optional(), // "lat,lng"
  radius_km: z.coerce.number().optional(),
  job_type: z.string().optional(),
  work_mode: z.string().optional(),
  category_id: z.string().optional(),
  experience_level: z.string().optional(),
  salary_min: z.coerce.number().optional(),
  salary_max: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

// Param validators are scoped per-route. The previous combined schema required
// both `jobId` and `companyId` simultaneously, which broke /companies/:companyId
// (no jobId param) and /jobs/:jobId (no companyId param).
const jobIdParamSchema = z.object({ jobId: z.string().min(1) });
const companyIdParamSchema = z.object({ companyId: z.string().min(1) });

export class PublicController {
  /**
   * GET /api/v1/public/jobs
   * Search jobs with filters (public endpoint)
   */
  async searchJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validation = jobSearchQuerySchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          errors: validation.error.flatten().fieldErrors,
        });
        return;
      }

      const filters: JobSearchFilters = validation.data;
      const result = await publicService.searchJobs(filters);

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
   * GET /api/v1/public/jobs/:jobId
   * Get a single job by ID (public endpoint)
   */
  async getJobById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validation = jobIdParamSchema.safeParse(req.params);
      if (!validation.success) {
        res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Invalid job ID',
        });
        return;
      }

      const { jobId } = validation.data;
      const job = await publicService.getJobById(jobId);

      if (!job) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Job not found',
        });
        return;
      }

      // Public route has no auth middleware → req.user is always undefined,
      // so attribute by IP + UA fingerprint.
      const viewer = buildViewerKey({
        ip: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
      });
      void recordJobView({
        jobId,
        viewerKey: viewer.key,
        viewerType: viewer.type,
        source: 'public',
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
   * GET /api/v1/public/skill-tags
   * Get all active skill tags (public endpoint)
   */
  async getSkillTags(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tags = await publicService.getSkillTags();

      res.json({
        status: 'success',
        data: tags,
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
   * GET /api/v1/public/job-categories
   * Get all active job categories (public endpoint)
   */
  async getJobCategories(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const categories = await publicService.getJobCategories();

      res.json({
        status: 'success',
        data: categories,
      });
    } catch (error) {
      console.error('Error getting job categories:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to get job categories',
      });
    }
  }

  /**
   * GET /api/v1/public/companies
   * Search approved companies with optional filters.
   */
  async searchCompanies(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await publicService.searchCompanies({
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        industry: typeof req.query.industry === 'string' ? req.query.industry : undefined,
        company_size: typeof req.query.company_size === 'string' ? req.query.company_size : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json({ status: 'success', data: result.companies, pagination: result.pagination });
    } catch (error) {
      console.error('Error searching companies:', error);
      res.status(500).json({ status: 'error', code: 'INTERNAL_ERROR', message: 'Failed to search companies' });
    }
  }

  /**
   * GET /api/v1/public/companies/industries
   * Distinct industries for the filter chip UI.
   */
  async listCompanyIndustries(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const industries = await publicService.listCompanyIndustries();
      res.json({ status: 'success', data: industries });
    } catch (error) {
      console.error('Error listing industries:', error);
      res.status(500).json({ status: 'error', code: 'INTERNAL_ERROR', message: 'Failed to list industries' });
    }
  }

  /**
   * GET /api/v1/public/companies/:companyId/jobs
   * Active jobs for the company (used by the company detail page).
   */
  async getCompanyJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validation = companyIdParamSchema.safeParse(req.params);
      if (!validation.success) {
        res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Invalid company ID',
        });
        return;
      }

      const { companyId } = validation.data;
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const result = await publicService.getCompanyJobs(companyId, page, limit);

      res.json({ status: 'success', data: result.jobs, pagination: result.pagination });
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
   * GET /api/v1/public/companies/:companyId
   * Get company public profile (public endpoint)
   */
  async getCompanyById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validation = companyIdParamSchema.safeParse(req.params);
      if (!validation.success) {
        res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Invalid company ID',
        });
        return;
      }

      const { companyId } = validation.data;
      const company = await publicService.getCompanyById(companyId);

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
   * GET /api/v1/public/config
   * Returns client-safe config values (keys restricted to frontend use via Google Cloud)
   */
  async getConfig(_req: AuthenticatedRequest, res: Response): Promise<void> {
    res.json({
      status: 'success',
      data: {
        googleMapsApiKey: config.GOOGLE_API_KEY ?? config.GOOGLE_MAPS_SERVER_KEY ?? '',
      },
    });
  }
}

export const publicController = new PublicController();
export default publicController;
