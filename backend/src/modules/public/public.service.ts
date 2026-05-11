import { Job, IJob } from '../../models/index.js';
import { Company } from '../../models/index.js';
import { SkillTag } from '../../models/index.js';
import { JobCategory } from '../../models/index.js';
import { PaginatedResult } from '../../types/index.js';

export interface JobSearchFilters {
  q?: string;
  city?: string;
  branch_id?: string;
  near?: string; // format: "lat,lng"
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

export interface JobSearchResult {
  jobs: IJob[];
  pagination: PaginatedResult<IJob>['pagination'];
}

export class PublicService {
  /**
   * Search jobs with full-text search, geo queries, and filters
   */
  async searchJobs(filters: JobSearchFilters): Promise<JobSearchResult> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(50, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      status: 'active',
    };

    // Search across job content + company name. The Job text-index doesn't
    // cover company info, so we look up matching company IDs separately.
    if (filters.q) {
      const q = filters.q.trim();
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

    // City filter (searches across all job locations)
    if (filters.city) {
      query['locations.city'] = { $regex: filters.city, $options: 'i' };
    }

    // Branch filter
    if (filters.branch_id) {
      query['locations.branch_id'] = filters.branch_id;
    }

    // Job type filter
    if (filters.job_type) {
      query.job_type = filters.job_type;
    }

    // Work mode filter
    if (filters.work_mode) {
      query.work_mode = filters.work_mode;
    }

    // Category filter
    if (filters.category_id) {
      query.category_id = filters.category_id;
    }

    // Experience level filter
    if (filters.experience_level) {
      query.experience_level = filters.experience_level;
    }

    // Salary range filter
    if (filters.salary_min !== undefined || filters.salary_max !== undefined) {
      query.$and = [];
      if (filters.salary_min !== undefined) {
        query.$and.push({ salary_max: { $gte: filters.salary_min } });
      }
      if (filters.salary_max !== undefined) {
        query.$and.push({ salary_min: { $lte: filters.salary_max } });
      }
    }

    const queryBuilder = Job.find(query);

    // Geo query using $geoNear aggregation
    if (filters.near && filters.radius_km) {
      const [lat, lng] = filters.near.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        const geoMatch = {
          $geoNear: {
            near: { type: 'Point', coordinates: [lng, lat] },
            distanceField: 'distance',
            maxDistance: filters.radius_km * 1000, // convert km to meters
            spherical: true,
            query: query,
          },
        };

        const geoQuery = Job.aggregate([geoMatch as unknown as Record<string, unknown>]);

        const total = await Job.aggregate([
          geoMatch as unknown as Record<string, unknown>,
          { $count: 'total' },
        ]);

        const jobs = await geoQuery.skip(skip).limit(limit);

        return {
          jobs: jobs as unknown as IJob[],
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

    // Apply pagination for non-geo queries
    const [jobs, total] = await Promise.all([
      queryBuilder
        .populate('company_id', 'name slug logo_url')
        .populate('category_id', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(query),
    ]);

    return {
      jobs: jobs as unknown as IJob[],
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
   * Get a single job by ID with company details
   */
  async getJobById(jobId: string): Promise<IJob | null> {
    return Job.findById(jobId)
      .populate('company_id', 'name slug logo_url description industry website_url')
      .populate('category_id', 'name slug icon_url')
      .populate('locations.branch_id', 'name city state country address phone email')
      .lean();
  }

  /**
   * Get all active skill tags
   */
  async getSkillTags(): Promise<Array<{ _id: string; name: string; slug: string; category?: string }>> {
    return SkillTag.find({ is_active: true })
      .select('_id name slug category')
      .sort({ name: 1 })
      .lean();
  }

  /**
   * Get all active job categories
   */
  async getJobCategories(): Promise<Array<{ _id: string; name: string; slug: string; icon_url?: string }>> {
    return JobCategory.find({ is_active: true })
      .select('_id name slug icon_url')
      .sort({ name: 1 })
      .lean();
  }

  /**
   * Search approved companies. Returns each company with the number of
   * currently active jobs so the UI can show "X open jobs" per card.
   */
  async searchCompanies(filters: {
    q?: string;
    industry?: string;
    company_size?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    companies: Array<{
      _id: string;
      name: string;
      slug?: string;
      logo_url?: string;
      description?: string;
      industry?: string;
      company_size?: string;
      founding_year?: number;
      website_url?: string;
      open_jobs: number;
    }>;
    pagination: { total: number; page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
  }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(50, Math.max(1, filters.limit || 12));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { approval_status: 'approved' };
    if (filters.q) query.name = { $regex: filters.q, $options: 'i' };
    if (filters.industry) query.industry = { $regex: filters.industry, $options: 'i' };
    if (filters.company_size) query.company_size = filters.company_size;

    const [companies, total] = await Promise.all([
      Company.find(query)
        .select('name slug logo_url description industry company_size founding_year website_url')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Company.countDocuments(query),
    ]);

    const ids = companies.map((c) => c._id);
    const counts = ids.length
      ? await Job.aggregate([
          { $match: { company_id: { $in: ids }, status: 'active' } },
          { $group: { _id: '$company_id', count: { $sum: 1 } } },
        ])
      : [];
    const countMap = new Map<string, number>(counts.map((c) => [String(c._id), c.count]));

    return {
      companies: companies.map((c) => ({
        _id: String(c._id),
        name: c.name,
        slug: c.slug,
        logo_url: c.logo_url,
        description: c.description,
        industry: c.industry,
        company_size: c.company_size,
        founding_year: c.founding_year,
        website_url: c.website_url,
        open_jobs: countMap.get(String(c._id)) ?? 0,
      })),
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
   * Distinct industries among approved companies — for populating the filter UI.
   */
  async listCompanyIndustries(): Promise<string[]> {
    const industries = await Company.distinct('industry', { approval_status: 'approved', industry: { $nin: [null, ''] } });
    return industries.filter((i): i is string => typeof i === 'string').sort();
  }

  /**
   * Active jobs for a given company. Used by the company detail page.
   */
  async getCompanyJobs(companyId: string, page = 1, limit = 20): Promise<{
    jobs: unknown[];
    pagination: { total: number; page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const query = { company_id: companyId, status: 'active' };

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate('company_id', 'name slug logo_url')
        .populate('category_id', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Job.countDocuments(query),
    ]);

    return {
      jobs,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
        hasNext: safePage * safeLimit < total,
        hasPrev: safePage > 1,
      },
    };
  }

  /**
   * Get company public profile by ID
   */
  async getCompanyById(companyId: string): Promise<{
    _id: string;
    name: string;
    slug: string;
    logo_url?: string;
    description?: string;
    industry?: string;
    company_size?: string;
    founding_year?: number;
    website_url?: string;
    linkedin_url?: string;
  } | null> {
    const company = await Company.findById(companyId)
      .select('name slug logo_url description industry company_size founding_year website_url linkedin_url')
      .lean();

    if (!company) return null;

    return company as {
      _id: string;
      name: string;
      slug: string;
      logo_url?: string;
      description?: string;
      industry?: string;
      company_size?: string;
      founding_year?: number;
      website_url?: string;
      linkedin_url?: string;
    };
  }
}

export const publicService = new PublicService();
export default publicService;
