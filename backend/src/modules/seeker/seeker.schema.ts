import { z } from 'zod';

// Common pagination schema
const paginationSchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

// Profile schemas
export const updateProfileSchema = z.object({
  body: z.object({
    first_name: z.string().max(100).optional(),
    last_name: z.string().max(100).optional(),
    phone: z.string().max(20).optional(),
    date_of_birth: z.string().datetime().optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    headline: z.string().max(255).optional(),
    bio: z.string().optional(),
    avatar_url: z.string().url().optional(),
    linkedin_url: z.string().url().optional(),
    github_url: z.string().url().optional(),
    portfolio_url: z.string().url().optional(),
  }),
});

export const updateVisibilitySchema = z.object({
  body: z.object({
    visibility: z.enum(['public', 'companies_only', 'hidden']),
  }),
});

// Education schemas
export const createEducationSchema = z.object({
  body: z.object({
    institution: z.string().max(255).optional(),
    degree: z.string().max(100).optional(),
    field_of_study: z.string().max(100).optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    is_current: z.boolean().optional(),
    gpa: z.number().min(0).max(10).optional(),
    description: z.string().optional(),
  }),
});

export const updateEducationSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    institution: z.string().max(255).optional(),
    degree: z.string().max(100).optional(),
    field_of_study: z.string().max(100).optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    is_current: z.boolean().optional(),
    gpa: z.number().min(0).max(10).optional(),
    description: z.string().optional(),
  }),
});

export const deleteEducationSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

// Experience schemas
export const createExperienceSchema = z.object({
  body: z.object({
    company_name: z.string().max(255).optional(),
    job_title: z.string().max(255).optional(),
    location: z.string().max(255).optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    is_current: z.boolean().optional(),
    description: z.string().optional(),
  }),
});

export const updateExperienceSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    company_name: z.string().max(255).optional(),
    job_title: z.string().max(255).optional(),
    location: z.string().max(255).optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    is_current: z.boolean().optional(),
    description: z.string().optional(),
  }),
});

export const deleteExperienceSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

// Skills schemas
export const addSkillsSchema = z.object({
  body: z.object({
    skills: z.array(z.object({
      skill_tag_id: z.string().min(1),
      proficiency: z.enum(['beginner', 'intermediate', 'expert']),
    })),
  }),
});

export const removeSkillSchema = z.object({
  params: z.object({ skillTagId: z.string().min(1) }),
});

// Certification schemas
export const createCertificationSchema = z.object({
  body: z.object({
    name: z.string().max(255).optional(),
    issuer: z.string().max(255).optional(),
    issue_date: z.string().datetime().optional(),
    expiry_date: z.string().datetime().optional(),
    credential_url: z.string().url().optional(),
  }),
});

export const updateCertificationSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().max(255).optional(),
    issuer: z.string().max(255).optional(),
    issue_date: z.string().datetime().optional(),
    expiry_date: z.string().datetime().optional(),
    credential_url: z.string().url().optional(),
  }),
});

export const deleteCertificationSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

// Resume schemas
export const uploadResumeSchema = z.object({
  body: z.object({
    label: z.string().max(100).optional(),
    file_url: z.string().url(),
    file_size_kb: z.number().optional(),
  }),
});

export const deleteResumeSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const setDefaultResumeSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

// Job search schemas
export const searchJobsSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    city: z.string().optional(),
    near: z.string().optional(),
    radius_km: z.coerce.number().optional(),
    job_type: z.string().optional(),
    work_mode: z.string().optional(),
    category_id: z.string().optional(),
    experience_level: z.string().optional(),
    salary_min: z.coerce.number().optional(),
    salary_max: z.coerce.number().optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }),
});

// Application schemas
export const createApplicationSchema = z.object({
  params: z.object({ jobId: z.string().min(1) }),
  body: z.object({
    resume_id: z.string().min(1),
    cover_letter_text: z.string().optional(),
  }),
});

export const getApplicationsSchema = z.object({
  query: paginationSchema.extend({
    status: z.string().optional(),
  }).optional(),
});

export const getApplicationByIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const deleteApplicationSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

// Notification schemas
export const markNotificationReadSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

// Job by ID schema
export const getJobByIdSchema = z.object({
  params: z.object({ jobId: z.string().min(1) }),
});

// Save/unsave job schema
export const saveJobSchema = z.object({
  params: z.object({ jobId: z.string().min(1) }),
});
