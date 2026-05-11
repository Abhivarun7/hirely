import api from './client';

// Dashboard / Analytics
export const getAdminStats = async (): Promise<any> => {
  const response = await api.get('/admin/analytics/overview');
  return response.data;
};

export const getRecentActivity = async (limit = 10): Promise<any[]> => {
  const response = await api.get('/admin/audit-logs', { params: { limit } });
  return response.data;
};

// Companies
export const getCompanies = (params?: { status?: string; search?: string; page?: number; limit?: number }) =>
  api.get('/admin/companies', { params });
export const getCompany = (id: string) => api.get(`/admin/companies/${id}`);
export const approveCompany = (id: string) => api.post(`/admin/companies/${id}/approve`);
export const rejectCompany = (id: string, reason?: string) => api.post(`/admin/companies/${id}/reject`, { reason });
export const suspendCompany = (id: string, reason?: string) => api.post(`/admin/companies/${id}/suspend`, { reason });
export const banCompany = (id: string, reason?: string) => api.post(`/admin/companies/${id}/ban`, { reason });

// Users
export const getUsers = (params?: { role?: string; status?: string; search?: string; page?: number; limit?: number }) =>
  api.get('/admin/users', { params });
export const getUser = (id: string) => api.get(`/admin/users/${id}`);
export const suspendUser = (id: string, reason?: string) => api.post(`/admin/users/${id}/suspend`, { reason });
export const banUser = (id: string, reason?: string) => api.post(`/admin/users/${id}/ban`, { reason });

// Jobs
export const getAdminJobs = (params?: { status?: string; search?: string; page?: number; limit?: number }) =>
  api.get('/admin/jobs', { params });
export const getAdminJob = (id: string) => api.get(`/admin/jobs/${id}`);
export const removeJob = (id: string) => api.post(`/admin/jobs/${id}/remove`);

// Categories
export const getCategories = () => api.get('/admin/job-categories');
export const createCategory = (data: any) => api.post('/admin/job-categories', data);
export const updateCategory = (id: string, data: any) => api.put(`/admin/job-categories/${id}`, data);
export const deleteCategory = (id: string) => api.delete(`/admin/job-categories/${id}`);

// Skill Tags
export const getSkillTags = (params?: { search?: string }) => api.get('/admin/skill-tags', { params });
export const createSkillTag = (data: any) => api.post('/admin/skill-tags', data);
export const updateSkillTag = (id: string, data: any) => api.put(`/admin/skill-tags/${id}`, data);
export const deleteSkillTag = (id: string) => api.delete(`/admin/skill-tags/${id}`);
export const mergeSkillTag = (id: string, targetId: string) => api.post(`/admin/skill-tags/${id}/merge`, { targetId });

// Tickets
export const getTickets = (params?: { status?: string; page?: number; limit?: number }) =>
  api.get('/admin/tickets', { params });
export const getTicket = (id: string) => api.get(`/admin/tickets/${id}`);
export const assignTicket = (id: string, adminId: string) =>
  api.put(`/admin/tickets/${id}/assign`, { assigned_to: adminId });
export const updateTicketStatus = (id: string, status: string) =>
  api.put(`/admin/tickets/${id}/status`, { status });

export interface AdminTicketAttachment {
  url: string;
  filename: string;
  mime: string;
  size: number;
}

export const replyTicket = (
  id: string,
  payload: { message?: string; attachments?: AdminTicketAttachment[] }
) => api.post(`/admin/tickets/${id}/reply`, payload);

export const uploadTicketAttachments = (id: string, files: File[]) => {
  const fd = new FormData();
  for (const f of files) fd.append('files', f);
  return api.post<{ data: AdminTicketAttachment[] }>(`/admin/tickets/${id}/attachments`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Ticket templates
export interface TicketTemplate {
  _id: string;
  name: string;
  content: string;
  is_active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const getTicketTemplates = (activeOnly = false) =>
  api.get<{ data: TicketTemplate[] }>('/admin/ticket-templates', {
    params: activeOnly ? { active: 'true' } : undefined,
  });
export const createTicketTemplate = (data: { name: string; content: string }) =>
  api.post<{ data: TicketTemplate }>('/admin/ticket-templates', data);
export const updateTicketTemplate = (
  id: string,
  data: { name?: string; content?: string; is_active?: boolean }
) => api.put<{ data: TicketTemplate }>(`/admin/ticket-templates/${id}`, data);
export const deleteTicketTemplate = (id: string) => api.delete(`/admin/ticket-templates/${id}`);

// Analytics
export const getOverviewAnalytics = (params?: { period?: string }) =>
  api.get('/admin/analytics/overview', { params });
export const getUserAnalytics = (params?: { period?: string }) =>
  api.get('/admin/analytics/users', { params });
export const getJobAnalytics = (params?: { period?: string }) =>
  api.get('/admin/analytics/jobs', { params });
export const getApplicationAnalytics = (params?: { period?: string }) =>
  api.get('/admin/analytics/applications', { params });
export const getCompanyAnalytics = () => api.get('/admin/analytics/companies');

// Audit Logs
export const getAuditLogs = (params?: { action?: string; page?: number; limit?: number }) =>
  api.get('/admin/audit-logs', { params });

// System Config
export const getConfig = () => api.get('/admin/config');
export const updateConfig = (data: Record<string, unknown>) => api.put('/admin/config', data);

// Admin Accounts
export interface AdminProfileFields {
  first_name?: string;
  last_name?: string;
  phone?: string;
  employee_id?: string;
  avatar_url?: string;
}

export const getAdmins = () => api.get('/admin/admins');
export const createAdmin = (
  data: {
    email: string;
    role_id: string;
    extra_permissions?: string[];
  } & AdminProfileFields
) => api.post('/admin/admins', data);
export const updateAdmin = (
  id: string,
  data: {
    role_id?: string;
    extra_permissions?: string[];
    is_active?: boolean;
  } & AdminProfileFields
) => api.put(`/admin/admins/${id}`, data);
export const deleteAdmin = (id: string) => api.delete(`/admin/admins/${id}`);
export const uploadAdminAvatar = (file: File) => {
  const fd = new FormData();
  fd.append('avatar', file);
  return api.post<{ data: { url: string } }>('/admin/admins/avatar', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Roles + Permission catalog
export interface RoleRecord {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
  is_system: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionCatalog {
  catalog: Record<string, string[]>;
  all: string[];
  systemRoleDescriptions: Record<string, string>;
}

export const getRoles = () => api.get<{ data: RoleRecord[] }>('/admin/roles');
export const getRole = (id: string) => api.get<{ data: RoleRecord }>(`/admin/roles/${id}`);
export const createRole = (data: {
  name: string;
  description?: string;
  permissions: string[];
}) => api.post<{ data: RoleRecord }>('/admin/roles', data);
export const updateRole = (
  id: string,
  data: { name?: string; description?: string; permissions?: string[] }
) => api.put<{ data: RoleRecord }>(`/admin/roles/${id}`, data);
export const deleteRole = (id: string) => api.delete(`/admin/roles/${id}`);
export const getPermissionCatalog = () =>
  api.get<{ data: PermissionCatalog }>('/admin/permissions/catalog');

// Seekers directory (admin-side)
export const getSeekerDirectory = (params?: { search?: string; page?: number; limit?: number }) =>
  api.get('/admin/seekers', { params });

// AI features
export const suggestCandidatesForJob = (jobId: string, limit = 10) =>
  api.get(`/admin/ai/jobs/${jobId}/candidates`, { params: { limit } });

export const getSeekerInsights = (userId: string) =>
  api.get(`/admin/ai/seekers/${userId}/insights`);

// Employment Officials
export interface OfficialPayload {
  email?: string;
  first_name?: string;
  last_name?: string;
  designation?: string;
  phone?: string;
  email_alt?: string;
  employee_code?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  search_radius_km?: number;
  avatar_url?: string;
}

export const getOfficials = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  city?: string;
}) => api.get('/admin/officials', { params });

export const getOfficial = (id: string) => api.get(`/admin/officials/${id}`);

export const createOfficial = (data: OfficialPayload) =>
  api.post('/admin/officials', data);

export const updateOfficial = (id: string, data: OfficialPayload) =>
  api.patch(`/admin/officials/${id}`, data);

export const deactivateOfficial = (id: string) =>
  api.post(`/admin/officials/${id}/deactivate`);

export const reactivateOfficial = (id: string) =>
  api.post(`/admin/officials/${id}/reactivate`);

export const resendOfficialWelcome = (id: string) =>
  api.post(`/admin/officials/${id}/resend-welcome`);

export default api;