import { Response } from 'express';
import config from '../../config/env.js';
import { User } from '../../models/User.js';
import authService from './auth.service.js';
import { emailService } from '../shared/email.service.js';
import type {
  RegisterInput,
  LoginInput,
  VerifyEmailInput,
  ResendVerificationInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  TotpVerifyInput,
  AcceptInviteInput,
  LogoutInput,
} from './auth.schema.js';
import type { AuthenticatedRequest } from '../../middleware/authenticate.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Send a standard success response.
 */
function success<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({
    status: 'success',
    data,
  });
}

/**
 * Send a standard error response.
 */
function error(res: Response, code: string, message: string, statusCode = 400): void {
  res.status(statusCode).json({
    status: 'error',
    code,
    message,
  });
}

/**
 * Set the refresh token cookie.
 */
function setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/api/v1/auth/refresh', // only sent on refresh endpoint
  });
}

/**
 * Clear the refresh token cookie.
 */
function clearRefreshCookie(res: Response): void {
  res.clearCookie('refresh_token', {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.NODE_ENV === 'production',
    path: '/api/v1/auth/refresh',
  });
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function register(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const input: RegisterInput = req.body;

    // Check if user already exists
    const existing = await User.findOne({ email: input.email.toLowerCase() });
    if (existing) {
      return error(res, 'EMAIL_EXISTS', 'An account with this email already exists', 409);
    }

    // Create the user
    const user = await authService.createUser(input);

    await emailService.sendVerificationEmail(
      { email: user.email },
      user.email_verify_token!
    );

    success(res, {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        is_email_verified: user.is_email_verified,
      },
      message: 'Registration successful. Please verify your email.',
    }, 201);
  } catch (err) {
    console.error('[Auth] Register error:', err);
    error(res, 'INTERNAL_ERROR', 'Registration failed', 500);
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const input: LoginInput = req.body;

    // Find user by email
    const user = await User.findOne({ email: input.email.toLowerCase() });
    if (!user) {
      return error(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    // Check if banned
    if (user.is_banned) {
      return error(res, 'ACCOUNT_BANNED', 'This account has been banned', 403);
    }

    // Check if active
    if (!user.is_active) {
      return error(res, 'ACCOUNT_INACTIVE', 'This account is inactive', 403);
    }

    // Verify password
    const isValidPassword = await authService.verifyPassword(input.password, user.password_hash);
    if (!isValidPassword) {
      return error(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    // If TOTP is enabled, verify the code
    if (user.totp_enabled) {
      if (!input.totp_code) {
        return res.status(403).json({
          status: 'error',
          code: 'TOTP_REQUIRED',
          message: 'Two-factor authentication code required',
          requires_2fa: true,
        });
      }

      const isValidTOTP = authService.verifyTOTP(user.totp_secret!, input.totp_code);
      if (!isValidTOTP) {
        return error(res, 'INVALID_TOTP', 'Invalid two-factor authentication code', 401);
      }
    }

    // Check email verification (for non-company roles, email must be verified)
    if (user.role !== 'company_owner' && !user.is_email_verified) {
      return error(res, 'EMAIL_NOT_VERIFIED', 'Please verify your email before logging in', 403);
    }

    // Update last login
    user.last_login_at = new Date();
    await user.save();

    // Generate tokens
    const accessToken = authService.generateAccessToken(user);
    const { token: refreshToken, expiresAt } = await authService.generateRefreshToken(user);

    // Set refresh cookie
    setRefreshCookie(res, refreshToken, expiresAt);

    success(res, {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 15 * 60, // 15 minutes in seconds
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        is_email_verified: user.is_email_verified,
        totp_enabled: user.totp_enabled,
      },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    error(res, 'INTERNAL_ERROR', 'Login failed', 500);
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Revoke the refresh token family for this user
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Revoke all refresh tokens for this user
      const token = authHeader.split(' ')[1];
      try {
        const payload = require('jsonwebtoken').decode(token) as { sub?: string };
        if (payload?.sub) {
          await authService.revokeRefreshTokenFamily(payload.sub);
        }
      } catch {
        // Ignore decode errors
      }
    }

    clearRefreshCookie(res);

    success(res, { message: 'Logged out successfully' });
  } catch (err) {
    console.error('[Auth] Logout error:', err);
    error(res, 'INTERNAL_ERROR', 'Logout failed', 500);
  }
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

export async function refresh(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      return error(res, 'REFRESH_TOKEN_MISSING', 'No refresh token provided', 401);
    }

    // Verify the refresh token
    const result = await authService.verifyRefreshToken(refreshToken);

    if (!result.valid) {
      clearRefreshCookie(res);
      if (result.reason === 'TOKEN_THEFT_DETECTED') {
        return error(res, 'TOKEN_THEFT_DETECTED', 'Session invalidated due to security concern', 401);
      }
      return error(res, result.reason, 'Invalid or expired refresh token', 401);
    }

    // Revoke only the used token row (rotation) — other devices keep their sessions.
    await authService.revokeRefreshTokenByJti(result.payload.sub, result.payload.jti);

    // Get the user
    const user = await User.findById(result.payload.sub).select('+totp_secret');
    if (!user) {
      return error(res, 'USER_NOT_FOUND', 'User not found', 404);
    }

    if (user.is_banned || !user.is_active) {
      return error(res, 'ACCOUNT_DISABLED', 'This account is no longer active', 403);
    }

    // Generate new tokens
    const newAccessToken = authService.generateAccessToken(user);
    const { token: newRefreshToken, expiresAt } = await authService.generateRefreshToken(user);

    setRefreshCookie(res, newRefreshToken, expiresAt);

    success(res, {
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: 15 * 60,
    });
  } catch (err) {
    console.error('[Auth] Refresh error:', err);
    error(res, 'INTERNAL_ERROR', 'Token refresh failed', 500);
  }
}

// ─── Verify Email ─────────────────────────────────────────────────────────────

export async function verifyEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const input: VerifyEmailInput = req.body;

    const result = await authService.verifyEmailVerificationToken(input.token);
    if (!result) {
      return error(res, 'INVALID_TOKEN', 'Invalid or expired verification token', 400);
    }

    const user = await User.findById(result.userId);
    if (!user) {
      return error(res, 'USER_NOT_FOUND', 'User not found', 404);
    }

    if (user.is_email_verified) {
      // Token still gets consumed so a leaked link can't be replayed.
      await authService.consumeServiceToken(result.jti, 'email_verification', result.exp);
      return success(res, { message: 'Email already verified' });
    }

    user.is_email_verified = true;
    user.email_verify_token = undefined;
    user.email_verify_expiry = undefined;
    await user.save();

    await authService.consumeServiceToken(result.jti, 'email_verification', result.exp);

    success(res, { message: 'Email verified successfully' });
  } catch (err) {
    console.error('[Auth] Verify email error:', err);
    error(res, 'INTERNAL_ERROR', 'Email verification failed', 500);
  }
}

// ─── Resend Verification ───────────────────────────────────────────────────────

export async function resendVerification(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const input: ResendVerificationInput = req.body;

    const user = await User.findOne({ email: input.email.toLowerCase() });
    if (!user) {
      // Don't reveal whether user exists
      return success(res, { message: 'If an account exists, a verification email has been sent' });
    }

    if (user.is_email_verified) {
      return success(res, { message: 'Email already verified' });
    }

    // Generate new verification token
    const token = authService.generateEmailVerificationToken(user._id.toString(), user.email);

    user.email_verify_token = token;
    user.email_verify_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    await emailService.sendVerificationEmail({ email: user.email }, token);

    success(res, { message: 'Verification email sent if an account exists' });
  } catch (err) {
    console.error('[Auth] Resend verification error:', err);
    error(res, 'INTERNAL_ERROR', 'Failed to resend verification email', 500);
  }
}

// ─── Forgot Password ───────────────────────────────────────────────────────────

export async function forgotPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const input: ForgotPasswordInput = req.body;

    const user = await User.findOne({ email: input.email.toLowerCase() });
    if (!user) {
      // Don't reveal whether user exists
      return success(res, { message: 'If an account exists, a reset email has been sent' });
    }

    // Generate password reset token
    const token = authService.generatePasswordResetToken(user._id.toString());

    await emailService.sendPasswordResetEmail({ email: user.email }, token);

    success(res, { message: 'Password reset email sent if an account exists' });
  } catch (err) {
    console.error('[Auth] Forgot password error:', err);
    error(res, 'INTERNAL_ERROR', 'Failed to process forgot password request', 500);
  }
}

// ─── Reset Password ───────────────────────────────────────────────────────────

export async function resetPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const input: ResetPasswordInput = req.body;

    const result = await authService.verifyPasswordResetToken(input.token);
    if (!result) {
      return error(res, 'INVALID_TOKEN', 'Invalid or expired reset token', 400);
    }

    const user = await User.findById(result.userId);
    if (!user) {
      return error(res, 'USER_NOT_FOUND', 'User not found', 404);
    }

    // Hash and save new password
    const passwordHash = await authService.hashPassword(input.new_password);
    user.password_hash = passwordHash;
    await user.save();

    // Mark token as consumed so it can't be replayed within its TTL.
    await authService.consumeServiceToken(result.jti, 'password_reset', result.exp);

    // Revoke all existing refresh tokens (force re-login)
    await authService.revokeRefreshTokenFamily(user._id.toString());

    success(res, { message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err) {
    console.error('[Auth] Reset password error:', err);
    error(res, 'INTERNAL_ERROR', 'Failed to reset password', 500);
  }
}

// ─── Setup TOTP ───────────────────────────────────────────────────────────────

export async function setupTOTP(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest & { user?: { sub: string } }).user;
    if (!user?.sub) {
      return error(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }

    const currentPassword = (req.body as { current_password?: string })?.current_password;
    if (!currentPassword) {
      return error(res, 'PASSWORD_REQUIRED', 'Current password is required to enable 2FA', 400);
    }

    const dbUser = await User.findById(user.sub).select('+totp_secret +password_hash');
    if (!dbUser) {
      return error(res, 'USER_NOT_FOUND', 'User not found', 404);
    }

    // Re-verify the current password before issuing a TOTP secret so a stolen
    // session can't silently lock the account behind 2FA.
    const passwordOk = await authService.verifyPassword(currentPassword, dbUser.password_hash);
    if (!passwordOk) {
      return error(res, 'INVALID_CREDENTIALS', 'Current password is incorrect', 401);
    }

    if (dbUser.totp_enabled) {
      return error(res, 'TOTP_ALREADY_ENABLED', 'Two-factor authentication is already enabled', 400);
    }

    const { secret, qrCodeUrl, otpauthUrl } = await authService.generateTOTPSecret(dbUser);

    // Temporarily store the secret (not yet enabled)
    dbUser.totp_secret = secret;
    await dbUser.save();

    success(res, {
      secret,
      qr_code_url: qrCodeUrl,
      otpauth_url: otpauthUrl,
      message: 'Scan the QR code with your authenticator app, then verify with a code',
    });
  } catch (err) {
    console.error('[Auth] Setup TOTP error:', err);
    error(res, 'INTERNAL_ERROR', 'Failed to setup two-factor authentication', 500);
  }
}

// ─── Verify TOTP ─────────────────────────────────────────────────────────────

export async function verifyTOTP(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest & { user?: { sub: string } }).user;
    if (!user?.sub) {
      return error(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }

    const input: TotpVerifyInput = req.body;

    const dbUser = await User.findById(user.sub).select('+totp_secret');
    if (!dbUser) {
      return error(res, 'USER_NOT_FOUND', 'User not found', 404);
    }

    if (!dbUser.totp_secret) {
      return error(res, 'TOTP_NOT_SETUP', 'Please setup TOTP first', 400);
    }

    const isValid = authService.verifyTOTP(dbUser.totp_secret, input.code);
    if (!isValid) {
      return error(res, 'INVALID_TOTP', 'Invalid authentication code', 401);
    }

    // Enable TOTP
    dbUser.totp_enabled = true;
    await dbUser.save();

    success(res, { message: 'Two-factor authentication enabled successfully' });
  } catch (err) {
    console.error('[Auth] Verify TOTP error:', err);
    error(res, 'INTERNAL_ERROR', 'Failed to verify two-factor authentication', 500);
  }
}

// ─── Accept Invite ────────────────────────────────────────────────────────────

export async function acceptInvite(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const input: AcceptInviteInput = req.body;

    const result = await authService.createUserFromInvite(input.token, input.password);
    if (!result) {
      return error(res, 'INVALID_TOKEN', 'Invalid or expired invite token', 400);
    }

    // Generate tokens for immediate login
    const accessToken = authService.generateAccessToken(result.user);
    const { token: refreshToken, expiresAt } = await authService.generateRefreshToken(result.user);

    setRefreshCookie(res, refreshToken, expiresAt);

    success(res, {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 15 * 60,
      user: {
        id: result.user._id,
        email: result.user.email,
        role: result.user.role,
        company_id: result.companyId,
        is_email_verified: result.user.is_email_verified,
      },
      message: 'Account created successfully. Welcome aboard!',
    }, 201);
  } catch (err) {
    console.error('[Auth] Accept invite error:', err);
    return error(res, 'INTERNAL_ERROR', 'Failed to accept invite', 500);
  }
}
