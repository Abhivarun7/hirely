import { z } from 'zod';

// ============ Profile Schemas ============

export const updateCompanyProfileSchema = z.object({
  body: z.object({
    name: z.string().max(255).optional(),
    description: z.string().optional(),
    industry: z.string().max(100).optional(),
    company_size: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
    founding_year: z.number().min(1800).max(2100).optional(),
    website_url: z.string().url().optional(),
    linkedin_url: z.string().url().optional(),
  }),
});

export const uploadLogoSchema = z.object({
  body: z.object({
    logo_url: z.string().url(),
  }),
});

// ============ Branch Schemas ============

export const createBranchSchema = z.object({
  body: z.object({
    name: z.string().max(255),
    city: z.string().max(100),
    state: z.string().max(100).optional(),
    country: z.string().max(100),
    address: z.string(),
    phone: z.string().max(20).optional(),
    email: z.string().email().max(255).optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    google_place_id: z.string().optional(),
  }),
});

export const updateBranchSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    address: z.string().optional(),
    phone: z.string().max(20).optional(),
    email: z.string().email().max(255).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    google_place_id: z.string().optional(),
    is_active: z.boolean().optional(),
  }),
});

export const deleteBranchSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

// ============ Team Schemas ============

export const inviteTeamMemberSchema = z.object({
  body: z.object({
    email: z.string().email(),
    role: z.enum(['hr_manager', 'recruiter', 'viewer']),
    branch_id: z.string().optional(), // optional branch scoping
  }),
});

export const updateMemberRoleSchema = z.object({
  params: z.object({ memberId: z.string().min(1) }),
  body: z.object({
    role: z.enum(['hr_manager', 'recruiter', 'viewer']),
    branch_id: z.string().optional(),
  }),
});

export const removeTeamMemberSchema = z.object({
  params: z.object({ memberId: z.string().min(1) }),
});

// ============ Job Schemas ============

export const createJobSchema = z.object({
  body: z.object({
    category_id: z.string().optional(),
    title: z.string().min(1).max(255),
    description: z.string().min(1),
    responsibilities: z.string().optional(),
    requirements: z.string().optional(),
    experience_level: z.enum(['entry', 'mid', 'senior', 'lead', 'executive']).optional(),
    experience_min_years: z.number().min(0).optional(),
    experience_max_years: z.number().min(0).optional(),
    job_type: z.enum(['full_time', 'part_time', 'contract', 'internship', 'freelance']),
    work_mode: z.enum(['onsite', 'remote', 'hybrid']),
    salary_min: z.number().min(0).optional(),
    salary_max: z.number().min(0).optional(),
    salary_currency: z.string().max(3).optional(),
    salary_disclosed: z.boolean().optional(),
    openings: z.number().int().min(1).optional(),
    application_deadline: z.string().datetime().optional(),
    locations: z.array(z.object({
      branch_id: z.string().optional(),
      label: z.string().max(255),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      city: z.string().max(100),
      state: z.string().max(100).optional(),
      country: z.string().max(100),
      address: z.string().optional(),
      google_place_id: z.string().optional(),
      openings: z.number().min(0).optional(),
      is_primary: z.boolean().optional(),
    })).min(1),
    skills: z.array(z.object({
      skill_tag_id: z.string().min(1),
      is_required: z.boolean().optional(),
    })).optional(),
  }),
});

export const updateJobSchema = z.object({
  params: z.object({ jobId: z.string().min(1) }),
  body: z.object({
    category_id: z.string().optional(),
    title: z.string().min(1).max(255).optional(),
    description: z.string().min(1).optional(),
    responsibilities: z.string().optional(),
    requirements: z.string().optional(),
    experience_level: z.enum(['entry', 'mid', 'senior', 'lead', 'executive']).optional(),
    experience_min_years: z.number().min(0).optional(),
    experience_max_years: z.number().min(0).optional(),
    job_type: z.enum(['full_time', 'part_time', 'contract', 'internship', 'freelance']).optional(),
    work_mode: z.enum(['onsite', 'remote', 'hybrid']).optional(),
    salary_min: z.number().min(0).optional(),
    salary_max: z.number().min(0).optional(),
    salary_currency: z.string().max(3).optional(),
    salary_disclosed: z.boolean().optional(),
    openings: z.number().int().min(1).optional(),
    application_deadline: z.string().datetime().optional(),
    locations: z.array(z.object({
      branch_id: z.string().optional(),
      label: z.string().max(255),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      city: z.string().max(100),
      state: z.string().max(100).optional(),
      country: z.string().max(100),
      address: z.string().optional(),
      google_place_id: z.string().optional(),
      openings: z.number().min(0).optional(),
      is_primary: z.boolean().optional(),
    })).min(1).optional(),
    skills: z.array(z.object({
      skill_tag_id: z.string().min(1),
      is_required: z.boolean().optional(),
    })).optional(),
  }),
});

export const jobIdParamSchema = z.object({
  params: z.object({ jobId: z.string().min(1) }),
});

// ============ Applicant Schemas ============

export const getApplicantsSchema = z.object({
  params: z.object({ jobId: z.string().min(1) }),
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    status: z.string().optional(),
  }),
});

export const getApplicantDetailSchema = z.object({
  params: z.object({
    jobId: z.string().min(1),
    applicationId: z.string().min(1),
  }),
});

export const updateApplicationStatusSchema = z.object({
  params: z.object({
    jobId: z.string().min(1),
    applicationId: z.string().min(1),
  }),
  body: z.object({
    status: z.enum(['reviewed', 'shortlisted', 'interview_scheduled', 'offer_extended', 'hired', 'rejected']),
    note: z.string().optional(),
  }),
});

export const addApplicantNoteSchema = z.object({
  params: z.object({
    jobId: z.string().min(1),
    applicationId: z.string().min(1),
  }),
  body: z.object({
    note: z.string().min(1),
  }),
});

export const getApplicantNotesSchema = z.object({
  params: z.object({
    jobId: z.string().min(1),
    applicationId: z.string().min(1),
  }),
});

export const scheduleInterviewSchema = z.object({
  params: z.object({
    jobId: z.string().min(1),
    applicationId: z.string().min(1),
  }),
  body: z.object({
    interview_date: z.string().datetime(),
    format: z.enum(['video', 'phone', 'in_person']),
    location_or_link: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const updateInterviewSchema = z.object({
  params: z.object({ interviewId: z.string().min(1) }),
  body: z.object({
    interview_date: z.string().datetime().optional(),
    format: z.enum(['video', 'phone', 'in_person']).optional(),
    location_or_link: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).optional(),
  }),
});

// ============ Dashboard Schemas ============

export const dashboardStatsSchema = z.object({
  query: z.object({
    period: z.enum(['7d', '30d', '90d']).optional(),
  }).optional(),
});
