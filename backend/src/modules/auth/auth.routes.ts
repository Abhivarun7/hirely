import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';
import * as authController from './auth.controller.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  setupTOTPSchema,
  totpVerifySchema,
  acceptInviteSchema,
  logoutSchema,
  refreshSchema,
} from './auth.schema.js';

const router = Router();

// ─── Public Routes ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 * Register a new user (job_seeker or company_owner).
 */
router.post('/register', authRateLimiter, validate(registerSchema), authController.register);

/**
 * POST /api/v1/auth/login
 * Authenticate user and issue tokens.
 * If TOTP is enabled, returns requires_2fa: true and expects totp_code in next request.
 */
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);

/**
 * POST /api/v1/auth/forgot-password
 * Send a password reset email to the user.
 */
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);

/**
 * POST /api/v1/auth/reset-password
 * Reset password using a valid reset token.
 */
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), authController.resetPassword);

/**
 * POST /api/v1/auth/verify-email
 * Verify email address using a token sent to the user's email.
 */
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);

/**
 * POST /api/v1/auth/resend-verification
 * Resend the email verification link.
 */
router.post('/resend-verification', validate(resendVerificationSchema), authController.resendVerification);

/**
 * POST /api/v1/auth/accept-invite
 * Accept a team invite and create user account.
 */
router.post('/accept-invite', validate(acceptInviteSchema), authController.acceptInvite);

// ─── Protected Routes ─────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/logout
 * Logout user and revoke all refresh tokens.
 */
router.post('/logout', authenticate, validate(logoutSchema), authController.logout);

/**
 * POST /api/v1/auth/refresh
 * Rotate refresh token and issue new access token.
 * Uses httpOnly cookie (auto-sent by browser).
 */
router.post('/refresh', validate(refreshSchema), authController.refresh);

/**
 * POST /api/v1/auth/totp/setup
 * Generate TOTP secret and QR code for authenticator app setup.
 * Requires authentication.
 */
router.post('/totp/setup', authenticate, validate(setupTOTPSchema), authController.setupTOTP);

/**
 * POST /api/v1/auth/totp/verify
 * Verify TOTP code and enable two-factor authentication.
 * Requires authentication.
 */
router.post('/totp/verify', authenticate, validate(totpVerifySchema), authController.verifyTOTP);

export default router;
