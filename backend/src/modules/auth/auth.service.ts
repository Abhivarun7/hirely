import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import config from '../../config/env.js';
import { User, IUser } from '../../models/User.js';
import { RefreshToken, IRefreshToken } from '../../models/RefreshToken.js';
import { ConsumedToken } from '../../models/ConsumedToken.js';
import { Company } from '../../models/Company.js';
import { SeekerProfile } from '../../models/SeekerProfile.js';
import type {
  RegisterInput,
  LoginInput,
  VerifyEmailInput,
  AcceptInviteInput,
} from './auth.schema.js';

// ─── Token Payload Types ──────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string; // user ID
  email: string;
  role: string;
  company_id?: string;
  seeker_profile_id?: string;
}

export interface RefreshTokenPayload {
  sub: string; // user ID
  jti: string; // token ID (family id)
  email: string;
  role: string;
}

export interface ServiceTokenPayload {
  sub: string;
  action: string;
  jti: string;
}

// ─── Token Generation ────────────────────────────────────────────────────────

/**
 * Generate a short-lived JWT access token (stored in memory, never persisted).
 * TTL: 15 minutes (config.JWT_ACCESS_TTL)
 */
export function generateAccessToken(
  user: Pick<IUser, '_id' | 'email' | 'role' | 'company_id' | 'seeker_profile_id'>
): string {
  const payload: AccessTokenPayload = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    ...(user.company_id ? { company_id: user.company_id.toString() } : {}),
    ...(user.seeker_profile_id ? { seeker_profile_id: user.seeker_profile_id.toString() } : {}),
  };

  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_TTL,
  });
}

/**
 * Generate a refresh token stored in DB with family tracking for theft detection.
 * TTL: 30 days (config.JWT_REFRESH_TTL)
 * Each call creates a new token family (jti) for rotation tracking.
 */
export async function generateRefreshToken(
  user: Pick<IUser, '_id' | 'email' | 'role'>
): Promise<{ token: string; expiresAt: Date }> {
  const jti = uuidv4(); // unique per token, used to look up the exact row
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Hash the raw token before storing
  const tokenPayload: RefreshTokenPayload = {
    sub: user._id.toString(),
    jti,
    email: user.email,
    role: user.role,
  };

  const rawToken = jwt.sign(tokenPayload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_TTL,
  });

  const tokenHash = await bcrypt.hash(rawToken, 10);

  await RefreshToken.create({
    user_id: user._id,
    jti,
    token_hash: tokenHash,
    expires_at: expiresAt,
    revoked: false,
  });

  return { token: rawToken, expiresAt };
}

/**
 * Generate a service token for internal operations (email verification, password reset).
 * Uses JWT_SERVICE_SECRET.
 */
export function generateServiceToken(
  payload: Omit<ServiceTokenPayload, 'jti'>,
  expiresIn: string = '1h'
): string {
  return jwt.sign({ ...payload, jti: uuidv4() }, config.JWT_SERVICE_SECRET, { expiresIn });
}

// ─── Token Verification ─────────────────────────────────────────────────────

/**
 * Verify a refresh token:
 * 1. Decode and verify JWT signature
 * 2. Check that the token exists in DB and is not revoked
 * 3. If token is revoked but part of a family, revoke entire family (theft detection)
 */
export async function verifyRefreshToken(
  rawToken: string
): Promise<{ valid: true; payload: RefreshTokenPayload; tokenDoc: IRefreshToken } | { valid: false; reason: string }> {
  let payload: RefreshTokenPayload;

  try {
    payload = jwt.verify(rawToken, config.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, reason: 'TOKEN_EXPIRED' };
    }
    return { valid: false, reason: 'INVALID_TOKEN' };
  }

  // Find the exact token document by JTI (one row per device).
  const tokenDoc = await RefreshToken.findOne({
    user_id: payload.sub,
    jti: payload.jti,
  });

  if (!tokenDoc) {
    return { valid: false, reason: 'TOKEN_REVOKED_OR_NOT_FOUND' };
  }

  if (tokenDoc.expires_at <= new Date()) {
    return { valid: false, reason: 'TOKEN_EXPIRED' };
  }

  // If the token row exists but is already revoked, the same JTI is being
  // presented twice — that's the theft signal. Revoke every session.
  if (tokenDoc.revoked) {
    await RefreshToken.updateMany(
      { user_id: payload.sub },
      { revoked: true }
    );
    return { valid: false, reason: 'TOKEN_THEFT_DETECTED' };
  }

  // Verify the raw token matches the stored hash for this row.
  const isValid = await bcrypt.compare(rawToken, tokenDoc.token_hash);
  if (!isValid) {
    return { valid: false, reason: 'INVALID_TOKEN' };
  }

  return { valid: true, payload, tokenDoc };
}

/**
 * Revoke a refresh token family (all tokens for a user).
 */
export async function revokeRefreshTokenFamily(userId: string): Promise<void> {
  await RefreshToken.updateMany(
    { user_id: userId },
    { revoked: true }
  );
}

/**
 * Revoke a specific refresh token by its JTI (single device logout / rotation).
 */
export async function revokeRefreshTokenByJti(userId: string, jti: string): Promise<void> {
  await RefreshToken.updateOne(
    { user_id: userId, jti },
    { revoked: true }
  );
}

/**
 * Revoke a specific refresh token by document _id.
 */
export async function revokeRefreshToken(tokenId: string): Promise<void> {
  await RefreshToken.updateOne(
    { _id: tokenId },
    { revoked: true }
  );
}

// ─── Password Hashing ────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Email Verification ─────────────────────────────────────────────────────

/**
 * Generate a secure email verification token.
 */
export function generateEmailVerificationToken(userId: string, email: string): string {
  return generateServiceToken({
    sub: userId,
    action: 'email_verification',
  }, '24h');
}

/**
 * Verify an email verification token and return the user ID.
 * Returns null if the token is invalid, expired, or has already been consumed.
 */
export async function verifyEmailVerificationToken(
  token: string
): Promise<{ userId: string; jti: string; exp: number } | null> {
  try {
    const payload = jwt.verify(token, config.JWT_SERVICE_SECRET) as jwt.JwtPayload & ServiceTokenPayload;
    if (payload.action !== 'email_verification' || !payload.jti) {
      return null;
    }
    const already = await ConsumedToken.exists({ jti: payload.jti });
    if (already) return null;
    return { userId: payload.sub, jti: payload.jti, exp: payload.exp ?? 0 };
  } catch {
    return null;
  }
}

// ─── Password Reset ─────────────────────────────────────────────────────────

/**
 * Generate a secure password reset token.
 */
export function generatePasswordResetToken(userId: string): string {
  return generateServiceToken({
    sub: userId,
    action: 'password_reset',
  }, '1h');
}

/**
 * Verify a password reset token.
 * Returns null if the token is invalid, expired, or has already been consumed.
 */
export async function verifyPasswordResetToken(
  token: string
): Promise<{ userId: string; jti: string; exp: number } | null> {
  try {
    const payload = jwt.verify(token, config.JWT_SERVICE_SECRET) as jwt.JwtPayload & ServiceTokenPayload;
    if (payload.action !== 'password_reset' || !payload.jti) {
      return null;
    }
    const already = await ConsumedToken.exists({ jti: payload.jti });
    if (already) return null;
    return { userId: payload.sub, jti: payload.jti, exp: payload.exp ?? 0 };
  } catch {
    return null;
  }
}

// ─── Invite Token ───────────────────────────────────────────────────────────

/**
 * Generate a secure invite token for team member acceptance.
 * Encodes email, companyId and role directly into the JWT so the
 * accept-invite flow is self-contained and requires no DB lookup.
 */
export function generateInviteToken(
  userId: string,
  email: string,
  companyId: string,
  role: string
): string {
  return jwt.sign(
    { sub: userId || 'invited', email, companyId, role, action: 'team_invite', jti: uuidv4() },
    config.JWT_SERVICE_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify a team invite token.
 * Returns null if invalid, expired, or already consumed.
 */
export async function verifyInviteToken(token: string): Promise<{
  userId: string;
  email: string;
  companyId: string;
  role: string;
  jti: string;
  exp: number;
} | null> {
  try {
    const payload = jwt.verify(token, config.JWT_SERVICE_SECRET) as jwt.JwtPayload & ServiceTokenPayload & {
      email?: string;
      companyId?: string;
      role?: string;
    };
    if (payload.action !== 'team_invite' || !payload.jti) {
      return null;
    }
    const already = await ConsumedToken.exists({ jti: payload.jti });
    if (already) return null;
    return {
      userId: payload.sub,
      email: payload.email || '',
      companyId: payload.companyId || '',
      role: payload.role || '',
      jti: payload.jti,
      exp: payload.exp ?? 0,
    };
  } catch {
    return null;
  }
}

/**
 * Mark a service-token JTI as consumed so it cannot be replayed.
 */
export async function consumeServiceToken(
  jti: string,
  action: string,
  exp: number
): Promise<void> {
  const expiresAt = exp > 0 ? new Date(exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  try {
    await ConsumedToken.create({ jti, action, expires_at: expiresAt });
  } catch {
    // Unique-index conflict means it was already consumed — that's fine.
  }
}

// ─── TOTP ───────────────────────────────────────────────────────────────────

/**
 * Generate a TOTP secret and QR code URL for authenticator app setup.
 */
export async function generateTOTPSecret(user: Pick<IUser, '_id' | 'email'>): Promise<{
  secret: string;
  qrCodeUrl: string;
  otpauthUrl: string;
}> {
  const secret = speakeasy.generateSecret({
    name: `${config.TOTP_ISSUER}:${user.email}`,
    length: 20,
  });

  const otpauthUrl = secret.otpauth_url!;

  const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

  return { secret: secret.base32!, qrCodeUrl, otpauthUrl };
}

/**
 * Verify a TOTP code against a user's secret.
 */
export function verifyTOTP(secret: string, code: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 1, // allow 1 step tolerance before/after
  });
}

// ─── User Creation ──────────────────────────────────────────────────────────

/**
 * Create a new user (job_seeker or company_owner).
 */
export async function createUser(input: RegisterInput): Promise<IUser> {
  const passwordHash = await hashPassword(input.password);

  let companyId: import('mongoose').Types.ObjectId | undefined;

  if (input.role === 'company_owner') {
    const companyName = (input as any).company_name || input.email.split('@')[0];
    const baseSlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slug = `${baseSlug}-${Date.now()}`;
    const company = await Company.create({ name: companyName, slug, approval_status: 'pending' });
    companyId = company._id as import('mongoose').Types.ObjectId;
  }

  const user = await User.create({
    email: input.email.toLowerCase(),
    password_hash: passwordHash,
    role: input.role,
    company_id: companyId,
    is_email_verified: false,
    is_active: true,
    is_banned: false,
    totp_enabled: false,
  });

  // For job seekers, create the linked SeekerProfile so future authenticated
  // requests can find it via `req.user.seeker_profile_id`. Without this every
  // /api/v1/seeker/* call would 403 with "No seeker profile associated".
  if (input.role === 'job_seeker') {
    const profile = await SeekerProfile.create({
      user_id: user._id,
      first_name: (input as { first_name?: string }).first_name,
      last_name: (input as { last_name?: string }).last_name,
    });
    user.seeker_profile_id = profile._id as import('mongoose').Types.ObjectId;
  }

  // Generate token after creation so the userId is available as sub
  const emailVerifyToken = generateEmailVerificationToken(user._id.toString(), user.email);
  user.email_verify_token = emailVerifyToken;
  user.email_verify_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  return user;
}

/**
 * Create a user from an invite token.
 */
export async function createUserFromInvite(
  token: string,
  password: string
): Promise<{ user: IUser; companyId: string } | null> {
  const decoded = await verifyInviteToken(token);
  if (!decoded) {
    return null;
  }

  const passwordHash = await hashPassword(password);

  const user = await User.findOneAndUpdate(
    { email: decoded.email.toLowerCase() },
    {
      $set: {
        password_hash: passwordHash,
        role: decoded.role as IUser['role'],
        company_id: decoded.companyId,
        is_email_verified: true,
        is_active: true,
        is_banned: false,
        totp_enabled: false,
        email_verify_token: undefined,
        email_verify_expiry: undefined,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // Mark invite token as consumed — single-use.
  await consumeServiceToken(decoded.jti, 'team_invite', decoded.exp);

  return { user: user!, companyId: decoded.companyId };
}

// ─── Auth Service ───────────────────────────────────────────────────────────

export const authService = {
  // Token operations
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshTokenFamily,
  revokeRefreshTokenByJti,
  revokeRefreshToken,
  generateServiceToken,

  // Password operations
  hashPassword,
  verifyPassword,

  // Email verification
  generateEmailVerificationToken,
  verifyEmailVerificationToken,

  // Password reset
  generatePasswordResetToken,
  verifyPasswordResetToken,

  // Invite
  generateInviteToken,
  verifyInviteToken,

  // Service-token consumption (single-use enforcement)
  consumeServiceToken,

  // TOTP
  generateTOTPSecret,
  verifyTOTP,

  // User operations
  createUser,
  createUserFromInvite,
};

export default authService;
