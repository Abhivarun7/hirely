import api from './client';

export interface CompanyProfile {
  id: string;
  name: string;
  description: string;
  industry: string;
  size: string;
  website: string;
  linkedIn: string;
  logo: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  companyId: string;
  city: string;
  address: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface TeamMember {
  id: string;
  email: string;
  // Mirror backend User.role enum exactly. The earlier 'admin' value here was
  // never accepted server-side (zod expects hr_manager/recruiter/viewer).
  role: 'company_owner' | 'hr_manager' | 'recruiter' | 'viewer';
  status: 'active' | 'pending';
  createdAt: string;
}

export interface Job {
  id: string;
  companyId: string;
  title: string;
  description: string;
  requirements: string;
  location: string[];
  skills: string[];
  salaryMin: number;
  salaryMax: number;
  currency: string;
  status: 'active' | 'closed' | 'draft';
  applicantsCount: number;
  viewsCount: number;
  postedAt: string;
  updatedAt: string;
}

export interface Applicant {
  id: string;
  jobId: string;
  seekerId: string;
  seeker: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatar: string;
    headline: string;
    resume: string;
  };
  status: 'applied' | 'under_review' | 'shortlisted' | 'rejected' | 'hired';
  appliedAt: string;
  updatedAt: string;
}

export interface CreateJobRequest {
  title: string;
  description: string;
  requirements: string;
  location: string[];
  skills: string[];
  salaryMin: number;
  salaryMax: number;
  currency: string;
  status: 'active' | 'draft';
}

export type ApplicationStatus =
  | 'applied'
  | 'reviewed'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'offer_extended'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

export interface UpdateApplicantStatusRequest {
  status: ApplicationStatus;
  note?: string;
}

export type ScreeningRecommendation =
  | 'strong_match'
  | 'possible_match'
  | 'weak_match'
  | 'not_a_match';

export interface AIScreeningResult {
  score: number;
  recommendation: ScreeningRecommendation;
  summary: string;
  strengths: string[];
  gaps: string[];
  screened_at: string;
}

export interface ScheduleInterviewRequest {
  interview_date: string;
  format: 'video' | 'phone' | 'in_person';
  location_or_link?: string;
  notes?: string;
}

export interface InterviewRecord {
  _id: string;
  application_id: string;
  scheduled_by: string;
  interview_date: string;
  format: 'video' | 'phone' | 'in_person';
  location_or_link?: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
}

export interface InternalNote {
  id: string;
  applicantId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Interview {
  id: string;
  applicantId: string;
  scheduledAt: string;
  duration: number;
  meetingLink: string;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface InviteRecord {
  id: string;
  job: { id: string; title: string };
  seeker: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
    avatar_url?: string;
  };
  inviter_email?: string;
  message?: string;
  status: 'sent' | 'opened' | 'clicked' | 'applied';
  sent_at: string;
  opened_at?: string;
  clicked_at?: string;
  applied_at?: string;
  open_count: number;
  click_count: number;
}

export interface SuggestedSeeker {
  seeker_id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  headline?: string;
  city?: string;
  avatar_url?: string;
  skills: string[];
  matched_skills: string[];
  total_experience_years?: number;
  score: number;
  score_breakdown: {
    skill_overlap: number;
    required_overlap: number;
    experience_fit: number;
  };
  best_job: { id: string; title: string };
  visibility: string;
  has_applied_already: boolean;
}

export interface NearbySeeker {
  seeker_id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  headline?: string;
  city?: string;
  avatar_url?: string;
  skills: string[];
  distance_km: number;
  nearest_branch: { id: string; name: string; city: string };
  updated_at?: string;
}

export const companyEndpoints = {
  // Profile
  getProfile: () => api.get<CompanyProfile>('/company/profile'),
  updateProfile: (data: Partial<CompanyProfile>) => api.put<CompanyProfile>('/company/profile', data),
  uploadLogo: (formData: FormData) => api.post<{ url: string }>('/company/profile/logo', formData),

  // Branches
  getBranches: () => api.get<Branch[]>('/company/branches'),
  createBranch: (data: Omit<Branch, 'id' | 'companyId' | 'createdAt'>) =>
    api.post<Branch>('/company/branches', data),
  updateBranch: (id: string, data: Partial<Branch>) =>
    api.put<Branch>(`/company/branches/${id}`, data),
  deleteBranch: (id: string) => api.delete(`/company/branches/${id}`),

  // Team
  getTeam: () => api.get<TeamMember[]>('/company/team'),
  inviteMember: (data: { email: string; role: TeamMember['role'] }) =>
    api.post<TeamMember>('/company/team/invite', data),
  updateMemberRole: (id: string, role: TeamMember['role']) =>
    api.put<TeamMember>(`/company/team/${id}/role`, { role }),
  removeMember: (id: string) => api.delete(`/company/team/${id}`),
  getPendingInvitations: () => api.get<TeamMember[]>('/company/team/invitations/pending'),

  // Jobs
  getJobs: (params?: { status?: Job['status']; page?: number; limit?: number }) =>
    api.get<{ data: Job[]; total: number; page: number; limit: number }>('/company/jobs', { params }),
  getJob: (id: string) => api.get<Job>(`/company/jobs/${id}`),
  createJob: (data: CreateJobRequest) => api.post<Job>('/company/jobs', data),
  generateJobWithAI: (data: { title: string; job_type: string; work_mode: string; experience_level?: string; experience_min_years?: number; experience_max_years?: number }) =>
    api.post<{ description: string; responsibilities: string; requirements: string; skills: string[] }>('/company/jobs/ai-generate', data),
  updateJob: (id: string, data: Partial<CreateJobRequest>) =>
    api.put<Job>(`/company/jobs/${id}`, data),
  deleteJob: (id: string) => api.delete(`/company/jobs/${id}`),
  duplicateJob: (id: string) => api.post<Job>(`/company/jobs/${id}/duplicate`),
  publishJob: (id: string) => api.post<Job>(`/company/jobs/${id}/publish`),
  closeJob: (id: string) => api.post<Job>(`/company/jobs/${id}/close`),
  getJobStats: (id: string) =>
    api.get<{ applicantsCount: number; viewsCount: number; thisMonthViews: number }>(
      `/company/jobs/${id}/stats`
    ),

  // Applicants
  getApplicants: (params?: { jobId?: string; status?: ApplicationStatus; page?: number; limit?: number; referred_only?: boolean }) =>
    api.get('/company/applicants', { params }),
  getApplicant: (id: string) => api.get(`/company/applicants/${id}`),
  updateApplicantStatus: (id: string, data: UpdateApplicantStatusRequest) =>
    api.put(`/company/applicants/${id}/status`, data),
  bulkUpdateStatus: (ids: string[], status: ApplicationStatus) =>
    api.put<{ updated: number }>('/company/applicants/bulk/status', { ids, status }),

  // Applicant Detail
  getApplicantNotes: (id: string) => api.get(`/company/applicants/${id}/notes`),
  addApplicantNote: (id: string, content: string) =>
    api.post(`/company/applicants/${id}/notes`, { note: content }),
  scheduleInterview: (id: string, data: ScheduleInterviewRequest) =>
    api.post(`/company/applicants/${id}/interviews`, data),
  updateInterview: (interviewId: string, data: Partial<InterviewRecord>) =>
    api.put(`/company/interviews/${interviewId}`, data),

  // AI Screening — pass { force: true } to skip the cached result and re-run.
  screenApplicant: (id: string, opts?: { force?: boolean }) =>
    api.post(`/company/applicants/${id}/screen`, undefined, {
      params: opts?.force ? { force: '1' } : undefined,
    }),

  // Skill Tags
  getSkillTags: (params?: { search?: string }) =>
    api.get('/public/skill-tags', { params }),
  createSkillTag: (name: string) =>
    api.post<{ _id: string; name: string }>('/company/skill-tags', { name }),

  // ==== Insights ====
  getInsightsSummary: () =>
    api.get<{
      active_jobs: number;
      total_matches: number;
      strong_matches: number;
      nearby_seekers: number;
      insights: string[];
      top_growing_skills: { name: string; seeker_count: number }[];
    }>('/company/insights/summary'),
  getSuggestedSeekers: (params?: { jobId?: string; limit?: number }) =>
    api.get<{
      items: SuggestedSeeker[];
      total: number;
    }>('/company/insights/suggested-seekers', { params }),
  getNearbySeekers: (params?: { radiusKm?: number; limit?: number; recencyDays?: number }) =>
    api.get<{
      items: NearbySeeker[];
      total: number;
    }>('/company/insights/nearby-seekers', { params }),
  explainSeekerMatch: (data: { seekerId: string; jobId: string }) =>
    api.post<{ summary: string; cached: boolean }>('/company/insights/explain-match', data),

  inviteSeekerToApply: (data: { seekerId: string; jobId: string; message?: string }) =>
    api.post<{ data: { sent: true } }>('/company/insights/invite', data),

  listInvites: (params?: {
    status?: 'sent' | 'opened' | 'clicked' | 'applied';
    jobId?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get<{
      data: {
        items: InviteRecord[];
        pagination: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
          hasNext: boolean;
        };
        summary: {
          total: number;
          sent: number;
          opened: number;
          clicked: number;
          applied: number;
        };
      };
    }>('/company/insights/invites', { params }),

  lookupInvites: (pairs: Array<{ seekerId: string; jobId: string }>) =>
    api.post<{
      data: Array<{
        seeker_id: string;
        job_id: string;
        status: 'sent' | 'opened' | 'clicked' | 'applied';
        sent_at: string;
        opened_at?: string;
        clicked_at?: string;
        applied_at?: string;
      }>;
    }>('/company/insights/invites/lookup', { pairs }),

  // Dashboard Stats
  getDashboardStats: (period: '7d' | '30d' | '90d' = '30d') =>
    api.get<DashboardStats>('/company/dashboard/stats', { params: { period } }),
};

export interface DashboardTopJob {
  id: string;
  title: string;
  status: Job['status'];
  applicantsCount: number;
  viewsCount: number;
  location: string;
}

export interface DashboardInterview {
  id: string;
  interviewDate: string;
  format: 'video' | 'phone' | 'in_person';
  locationOrLink?: string;
  candidateName: string;
  candidateAvatar?: string;
  jobTitle: string;
  applicationId: string;
}

export interface DashboardAttentionItem {
  id: string;
  title: string;
  location: string;
  type: 'no_applicants' | 'stalled';
  days: number;
}

export interface DashboardBranch {
  id: string;
  name: string;
  city: string;
  count: number;
  percentage: number;
}

export interface DashboardStats {
  period: '7d' | '30d' | '90d';
  activeJobs: number;
  closingThisWeek: number;
  totalApplications: number;
  totalApplicants: number;
  applicantsDelta: number;
  monthlyViews: number;
  thisMonthViews: number;
  lifetimeViews: number;
  avgTimeToHire: number;
  timeToHireDelta: number;
  applicantsTrend: number[];
  pipeline: {
    applied: number;
    shortlisted: number;
    interview: number;
    offer: number;
    hired: number;
  };
  statusBreakdown: Record<string, number>;
  topJobs: DashboardTopJob[];
  todayInterviews: DashboardInterview[];
  needingAttention: DashboardAttentionItem[];
  branchDistribution: DashboardBranch[];
  recentApplications: Array<{
    id: string;
    seekerId: string;
    seekerName: string;
    seekerAvatar: string;
    jobTitle: string;
    status: ApplicationStatus;
    appliedAt: string;
  }>;
}
