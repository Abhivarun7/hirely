import axios from 'axios';
import { API_BASE_URL } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  role: 'job_seeker' | 'company';
  firstName?: string;
  companyName?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: string;
  };
  message: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

const authApi = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  withCredentials: true,
});

export const authEndpoints = {
  login: (data: LoginRequest) => authApi.post<AuthResponse>('/login', data),
  register: (data: RegisterRequest) => authApi.post<AuthResponse>('/register', data),
  logout: () => authApi.post('/logout'),
  refresh: () => authApi.post('/refresh'),
  verifyEmail: (token: string) => authApi.post('/verify-email', { token }),
  resendVerification: (email: string) => authApi.post('/resend-verification', { email }),
  forgotPassword: (data: ForgotPasswordRequest) => authApi.post('/forgot-password', data),
  resetPassword: (data: ResetPasswordRequest) => authApi.post('/reset-password', data),
  setupTOTP: (currentPassword: string) =>
    authApi.post('/totp/setup', { current_password: currentPassword }),
  verifyTOTP: (code: string) => authApi.post('/totp/verify', { code }),
  acceptInvite: (token: string, password: string) =>
    authApi.post('/accept-invite', { token, password }),
};

export default authApi;