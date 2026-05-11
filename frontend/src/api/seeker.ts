import api from './client';

// ─── Profile ────────────────────────────────────────────────────────────────

export const getProfile = () => api.get('/seeker/profile');
export const updateProfile = (data: Record<string, unknown>) => api.put('/seeker/profile', data);
export const updateVisibility = (data: Record<string, unknown>) => api.put('/seeker/profile/visibility', data);

// ─── Education ───────────────────────────────────────────────────────────────

export const addEducation = (data: Record<string, unknown>) => api.post('/seeker/profile/education', data);
export const updateEducation = (id: string, data: Record<string, unknown>) => api.put(`/seeker/profile/education/${id}`, data);
export const deleteEducation = (id: string) => api.delete(`/seeker/profile/education/${id}`);

// ─── Experience ──────────────────────────────────────────────────────────────

export const addExperience = (data: Record<string, unknown>) => api.post('/seeker/profile/experience', data);
export const updateExperience = (id: string, data: Record<string, unknown>) => api.put(`/seeker/profile/experience/${id}`, data);
export const deleteExperience = (id: string) => api.delete(`/seeker/profile/experience/${id}`);

// ─── Skills ──────────────────────────────────────────────────────────────────

export const addSkills = (skillTagIds: string[]) => api.post('/seeker/profile/skills', { skill_tag_ids: skillTagIds });
export const removeSkill = (skillTagId: string) => api.delete(`/seeker/profile/skills/${skillTagId}`);
export const createSkillTag = (name: string) => api.post<{ _id: string; name: string }>('/seeker/profile/skill-tags', { name });

// ─── Certifications ───────────────────────────────────────────────────────────

export const addCertification = (data: Record<string, unknown>) => api.post('/seeker/profile/certifications', data);
export const updateCertification = (id: string, data: Record<string, unknown>) => api.put(`/seeker/profile/certifications/${id}`, data);
export const deleteCertification = (id: string) => api.delete(`/seeker/profile/certifications/${id}`);

// ─── Avatar ──────────────────────────────────────────────────────────────────

export const uploadAvatar = (formData: FormData) =>
  api.post('/seeker/profile/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const removeAvatar = () => api.delete('/seeker/profile/avatar');

// ─── Resumes ─────────────────────────────────────────────────────────────────

export const uploadResume = (formData: FormData) => api.post('/seeker/profile/resumes', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteResume = (id: string) => api.delete(`/seeker/profile/resumes/${id}`);
export const setDefaultResume = (id: string) => api.put(`/seeker/profile/resumes/${id}/default`);

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export interface JobSearchParams {
  q?: string;
  location?: string;
  job_type?: string;
  work_mode?: string;
  salary_min?: number;
  salary_max?: number;
  category?: string;
  page?: number;
  limit?: number;
}

export const searchJobs = (params?: JobSearchParams) => api.get('/seeker/jobs', { params });
export const getRecommendedJobs = () => api.get('/seeker/jobs/recommended');
export const getSavedJobs = () => api.get('/seeker/jobs/saved');
export const getJobById = (jobId: string) => api.get(`/seeker/jobs/${jobId}`);
export const saveJob = (jobId: string) => api.post(`/seeker/jobs/${jobId}/save`);
export const unsaveJob = (jobId: string) => api.delete(`/seeker/jobs/${jobId}/save`);

// ─── Applications ─────────────────────────────────────────────────────────────

export const applyToJob = (jobId: string, data: { resume_id?: string; cover_letter?: string }) =>
  api.post(`/seeker/jobs/${jobId}/apply`, data);
export const getApplications = (params?: { status?: string; page?: number; limit?: number }) =>
  api.get('/seeker/applications', { params });
export const getApplicationById = (id: string) => api.get(`/seeker/applications/${id}`);
export const withdrawApplication = (id: string) => api.delete(`/seeker/applications/${id}`);

// ─── Home Feed ───────────────────────────────────────────────────────────────

export interface HomeFeedParams {
  lat?: number;
  lng?: number;
  reco_limit?: number;
  nearby_limit?: number;
}

export const getHomeFeed = (params?: HomeFeedParams) =>
  api.get('/seeker/home/feed', { params });

export const dismissRecommendation = (jobId: string) =>
  api.post('/seeker/home/dismiss', { job_id: jobId });

export interface TrackEventPayload {
  type: 'view' | 'click' | 'apply' | 'dismiss' | 'save';
  source: 'reco' | 'nearby';
  job_id?: string;
  company_id?: string;
  score?: number;
  position?: number;
}

export const trackHomeEvent = (payload: TrackEventPayload) =>
  api.post('/seeker/home/track', payload);

// ─── Notifications ───────────────────────────────────────────────────────────

export const getNotifications = (params?: { page?: number; limit?: number }) =>
  api.get('/seeker/notifications', { params });
export const markNotificationRead = (id: string) => api.put(`/seeker/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/seeker/notifications/read-all');
