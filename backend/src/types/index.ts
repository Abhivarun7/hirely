// User roles
export type UserRole =
  | 'job_seeker'
  | 'company_owner'
  | 'hr_manager'
  | 'recruiter'
  | 'viewer'
  | 'super_admin'
  | 'moderator'
  | 'support_admin'
  | 'analytics_admin';

// Company roles (subset of company-scoped roles)
export type CompanyRole = 'company_owner' | 'hr_manager' | 'recruiter' | 'viewer';

// Admin roles
export type AdminRole = 'super_admin' | 'moderator' | 'support_admin' | 'analytics_admin';

// Application status pipeline
export type ApplicationStatus =
  | 'applied'
  | 'reviewed'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'offer_extended'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

// Job status
export type JobStatus = 'draft' | 'active' | 'closed' | 'removed';

// Job types
export type JobType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance';

// Work mode
export type WorkMode = 'onsite' | 'remote' | 'hybrid';

// Experience level
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';

// Company approval status
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'banned';

// Ticket status
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

// Interview
export type InterviewFormat = 'video' | 'phone' | 'in_person';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

// Skill proficiency
export type Proficiency = 'beginner' | 'intermediate' | 'expert';

// Profile visibility
export type Visibility = 'public' | 'companies_only' | 'hidden';

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// API response shape
export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  code?: string;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
  pagination?: PaginatedResult<unknown>['pagination'];
}

// Geo location
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface GeoQuery {
  geoNear?: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
}
