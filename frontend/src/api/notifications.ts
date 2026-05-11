import api from './client';

export interface AppNotification {
  _id: string;
  user_id: string;
  type?: string;
  title: string;
  body?: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface ListNotificationsResponse {
  status: 'success';
  data: AppNotification[];
  unreadCount: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const listNotifications = (params?: { page?: number; limit?: number }) =>
  api.get<ListNotificationsResponse>('/notifications', { params });

export const getUnreadCount = () =>
  api.get<{ status: 'success'; data: { count: number } }>('/notifications/unread-count');

export const markNotificationRead = (id: string) =>
  api.put<{ status: 'success'; data: AppNotification }>(`/notifications/${id}/read`);

export const markAllNotificationsRead = () =>
  api.put<{ status: 'success' }>('/notifications/read-all');
