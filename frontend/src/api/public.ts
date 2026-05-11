import axios from 'axios';
import { API_BASE_URL } from './client';

const publicApi = axios.create({ baseURL: API_BASE_URL });

export interface PublicJobSearchParams {
  q?: string;
  city?: string;
  job_type?: string;
  work_mode?: string;
  experience_level?: string;
  salary_min?: number;
  salary_max?: number;
  page?: number;
  limit?: number;
}

export const searchPublicJobs = (params?: PublicJobSearchParams) =>
  publicApi.get('/public/jobs', { params });

export const getPublicJob = (jobId: string) =>
  publicApi.get(`/public/jobs/${jobId}`);

export const getPublicCategories = () =>
  publicApi.get('/public/job-categories');

// ─── Companies ───────────────────────────────────────────────────────────────

export interface PublicCompanySearchParams {
  q?: string;
  industry?: string;
  company_size?: string;
  page?: number;
  limit?: number;
}

export interface PublicCompany {
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
}

export const searchPublicCompanies = (params?: PublicCompanySearchParams) =>
  publicApi.get('/public/companies', { params });

export const getPublicCompanyIndustries = () =>
  publicApi.get('/public/companies/industries');

export const getPublicCompany = (companyId: string) =>
  publicApi.get(`/public/companies/${companyId}`);

export const getPublicCompanyJobs = (companyId: string, params?: { page?: number; limit?: number }) =>
  publicApi.get(`/public/companies/${companyId}/jobs`, { params });
