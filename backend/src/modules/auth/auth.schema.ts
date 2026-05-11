import { z } from 'zod';

// ─── Common ───────────────────────────────────────────────────────────────────

const emailSchema = z.string().email('Invalid email address').max(255);
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number');

// ─── Register ─────────────────────────────────────────────────────────────────

const jobSeekerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: z.literal('job_seeker'),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
});

const companyBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: z.literal('company_owner'),
  company_name: z.string().min(1).max(255).optional(),
});

export const registerSchema = z.object({
  body: z.union([jobSeekerBodySchema, companyBodySchema]),
});

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
    totp_code: z.string().regex(/^\d{6}$/, 'TOTP code must be 6 digits').optional(),
  }),
});

// ─── Forgot Password ─────────────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

// ─── Reset Password ──────────────────────────────────────────────────────────

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    new_password: passwordSchema,
  }),
});

// ─── Verify Email ───────────────────────────────────────────────────────────

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Verification token is required'),
  }),
});

// ─── Resend Verification ────────────────────────────────────────────────────

export const resendVerificationSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

// ─── TOTP Setup ──────────────────────────────────────────────────────────────

export const setupTOTPSchema = z.object({
  body: z.object({
    current_password: z.string().min(1, 'Current password is required'),
  }),
});

// ─── TOTP Verify ────────────────────────────────────────────────────────────

export const totpVerifySchema = z.object({
  body: z.object({
    code: z.string().regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
  }),
});

// ─── Accept Invite ──────────────────────────────────────────────────────────

export const acceptInviteSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Invite token is required'),
    password: passwordSchema,
  }),
});

// ─── Logout / Refresh ────────────────────────────────────────────────────────

export const logoutSchema = z.object({
  body: z.object({
    refresh_token: z.string().optional(),
  }),
});

export const refreshSchema = z.object({
  body: z.object({}),
});

// ─── Type exports ────────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>['body'];
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>['body'];
export type SetupTOTPInput = z.infer<typeof setupTOTPSchema>['body'];
export type TotpVerifyInput = z.infer<typeof totpVerifySchema>['body'];
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>['body'];
export type LogoutInput = z.infer<typeof logoutSchema>['body'];
export type RefreshInput = z.infer<typeof refreshSchema>['body'];
