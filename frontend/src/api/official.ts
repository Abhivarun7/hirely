import api from './client';

export interface OfficialProfile {
  _id: string;
  user_id: string | { _id: string; email: string; last_login_at?: string };
  first_name: string;
  last_name: string;
  designation: string;
  phone?: string;
  email_alt?: string;
  avatar_url?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  search_radius_km: number;
  is_active: boolean;
  createdAt: string;
}

export const getMe = () => api.get('/official/me');
export const updateMe = (data: Partial<OfficialProfile>) => api.put('/official/me', data);

export const getNearbyJobs = (params?: { page?: number; limit?: number; search?: string; category_id?: string }) =>
  api.get('/official/jobs/nearby', { params });

export const getCandidates = (params?: { page?: number; limit?: number; search?: string; kind?: 'all' | 'registered' | 'walk_in' }) =>
  api.get('/official/candidates', { params });

export const getCandidate = (id: string) => api.get(`/official/candidates/${id}`);

export const createWalkIn = (formData: FormData) =>
  api.post('/official/candidates/walk-in', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const pushCandidate = (data: { seeker_id: string; job_id: string; resume_id?: string; push_note?: string }) =>
  api.post('/official/push', data);

export const listPushes = (params?: { page?: number; limit?: number }) =>
  api.get('/official/pushes', { params });

export const getNearbyHires = (params?: { page?: number; limit?: number }) =>
  api.get('/official/hires/nearby', { params });

export default {
  getMe,
  updateMe,
  getNearbyJobs,
  getCandidates,
  getCandidate,
  createWalkIn,
  pushCandidate,
  listPushes,
  getNearbyHires,
};
